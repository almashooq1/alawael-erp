/**
 * Programs Routes — مسارات API لمكتبة البرامج التأهيلية
 *
 * @module domains/programs/routes/programs.routes
 */

const express = require('express');
const router = express.Router();
const { programsService } = require('../services/ProgramsService');

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function getUserId(req) {
  return req.user?._id || req.user?.id || req.headers['x-user-id'];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Program CRUD
// ═══════════════════════════════════════════════════════════════════════════════

/** POST / — إنشاء برنامج */
router.post(
  '/',
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
      branchId: req.query.branchId || req.user?.branchId,
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
      req.query.branchId || req.user?.branchId
    );
    res.json({ success: true, data });
  })
);

/** GET /overdue — التسجيلات المتأخرة */
router.get(
  '/overdue',
  asyncHandler(async (req, res) => {
    const data = await programsService.getOverdueEnrollments(
      req.query.branchId || req.user?.branchId
    );
    res.json({ success: true, data, total: data.length });
  })
);

/** GET /:id — تفاصيل برنامج */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const program = await programsService.getProgram(req.params.id);
    res.json({ success: true, data: program });
  })
);

/** PUT /:id — تحديث برنامج */
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const program = await programsService.updateProgram(req.params.id, req.body);
    res.json({ success: true, data: program });
  })
);

/** POST /:id/publish — نشر برنامج */
router.post(
  '/:id/publish',
  asyncHandler(async (req, res) => {
    const program = await programsService.publishProgram(req.params.id, getUserId(req));
    res.json({ success: true, data: program });
  })
);

/** GET /:id/dashboard — لوحة تحكم البرنامج */
router.get(
  '/:id/dashboard',
  asyncHandler(async (req, res) => {
    const data = await programsService.getProgramDashboard(req.params.id);
    res.json({ success: true, data });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// Enrollment
// ═══════════════════════════════════════════════════════════════════════════════

/** POST /enroll — تسجيل مستفيد في برنامج */
router.post(
  '/enroll',
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

/** GET /enrollments/:id — تفاصيل تسجيل */
router.get(
  '/enrollments/:id',
  asyncHandler(async (req, res) => {
    const data = await programsService.getEnrollmentDetails(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'التسجيل غير موجود' });
    res.json({ success: true, data });
  })
);

/** POST /enrollments/:id/approve — موافقة */
router.post(
  '/enrollments/:id/approve',
  asyncHandler(async (req, res) => {
    const data = await programsService.approveEnrollment(req.params.id, getUserId(req));
    res.json({ success: true, data });
  })
);

/** POST /enrollments/:id/activate — تفعيل */
router.post(
  '/enrollments/:id/activate',
  asyncHandler(async (req, res) => {
    const data = await programsService.activateEnrollment(req.params.id, getUserId(req));
    res.json({ success: true, data });
  })
);

/** POST /enrollments/:id/withdraw — انسحاب */
router.post(
  '/enrollments/:id/withdraw',
  asyncHandler(async (req, res) => {
    const data = await programsService.withdrawEnrollment(
      req.params.id,
      getUserId(req),
      req.body.reason
    );
    res.json({ success: true, data });
  })
);

/** POST /enrollments/:id/complete — إتمام */
router.post(
  '/enrollments/:id/complete',
  asyncHandler(async (req, res) => {
    const data = await programsService.completeEnrollment(req.params.id, getUserId(req), req.body);
    res.json({ success: true, data });
  })
);

/** POST /enrollments/:id/log-session — تسجيل جلسة */
router.post(
  '/enrollments/:id/log-session',
  asyncHandler(async (req, res) => {
    const data = await programsService.logSession(req.params.id, req.body);
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
