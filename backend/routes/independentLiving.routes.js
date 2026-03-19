/**
 * @module routes/independentLiving.routes
 * @description مسارات نظام الانتقال للحياة المستقلة
 * يشمل: تقييمات ADL، خطط التدريب، تتبع التقدم، الإسكان المدعوم
 */

const express = require('express');
const router = express.Router();
const IndependentLivingController = require('../controllers/independentLiving.controller');
const { protect, authorize } = require('../middleware/auth');

// ═══════════════════════════════════════════════════════
//  لوحة المعلومات والتقارير
// ═══════════════════════════════════════════════════════

/**
 * @route   GET /api/independent-living/dashboard
 * @desc    لوحة معلومات نظام الحياة المستقلة
 * @access  Private (supervisor, admin, manager)
 */
router.get(
  '/dashboard',
  protect,
  authorize('supervisor', 'admin', 'super_admin', 'manager'),
  IndependentLivingController.getDashboard
);

/**
 * @route   GET /api/independent-living/reports/beneficiary/:beneficiaryId
 * @desc    تقرير شامل لمستفيد
 * @access  Private
 */
router.get(
  '/reports/beneficiary/:beneficiaryId',
  protect,
  IndependentLivingController.getBeneficiaryReport
);

// ═══════════════════════════════════════════════════════
//  تقييمات مهارات الحياة اليومية (ADL)
// ═══════════════════════════════════════════════════════

/**
 * @route   GET /api/independent-living/assessments/compare/:beneficiaryId
 * @desc    مقارنة تقييمات مستفيد عبر الزمن
 * @access  Private
 */
router.get(
  '/assessments/compare/:beneficiaryId',
  protect,
  IndependentLivingController.compareAssessments
);

/**
 * @route   POST /api/independent-living/assessments
 * @desc    إنشاء تقييم ADL جديد
 * @access  Private (therapist, supervisor, admin)
 */
router.post(
  '/assessments',
  protect,
  authorize('therapist', 'supervisor', 'admin', 'super_admin', 'doctor'),
  IndependentLivingController.createAssessment
);

/**
 * @route   GET /api/independent-living/assessments
 * @desc    جلب تقييمات ADL
 * @access  Private
 */
router.get('/assessments', protect, IndependentLivingController.getAssessments);

/**
 * @route   GET /api/independent-living/assessments/:id
 * @desc    جلب تقييم ADL بالتفصيل
 * @access  Private
 */
router.get('/assessments/:id', protect, IndependentLivingController.getAssessmentById);

/**
 * @route   PUT /api/independent-living/assessments/:id
 * @desc    تحديث تقييم ADL
 * @access  Private (therapist, supervisor, admin)
 */
router.put(
  '/assessments/:id',
  protect,
  authorize('therapist', 'supervisor', 'admin', 'super_admin', 'doctor'),
  IndependentLivingController.updateAssessment
);

/**
 * @route   DELETE /api/independent-living/assessments/:id
 * @desc    حذف تقييم ADL
 * @access  Private (admin)
 */
router.delete(
  '/assessments/:id',
  protect,
  authorize('admin', 'super_admin'),
  IndependentLivingController.deleteAssessment
);

/**
 * @route   POST /api/independent-living/assessments/:id/review
 * @desc    مراجعة تقييم ADL
 * @access  Private (supervisor, admin)
 */
router.post(
  '/assessments/:id/review',
  protect,
  authorize('supervisor', 'admin', 'super_admin'),
  IndependentLivingController.reviewAssessment
);

// ═══════════════════════════════════════════════════════
//  خطط التدريب الفردية
// ═══════════════════════════════════════════════════════

/**
 * @route   POST /api/independent-living/plans
 * @desc    إنشاء خطة تدريب فردية
 * @access  Private (therapist, supervisor, admin)
 */
router.post(
  '/plans',
  protect,
  authorize('therapist', 'supervisor', 'admin', 'super_admin', 'doctor'),
  IndependentLivingController.createPlan
);

/**
 * @route   GET /api/independent-living/plans
 * @desc    جلب خطط التدريب
 * @access  Private
 */
router.get('/plans', protect, IndependentLivingController.getPlans);

/**
 * @route   GET /api/independent-living/plans/:id
 * @desc    جلب خطة تدريب بالتفصيل
 * @access  Private
 */
router.get('/plans/:id', protect, IndependentLivingController.getPlanById);

/**
 * @route   PUT /api/independent-living/plans/:id
 * @desc    تحديث خطة تدريب
 * @access  Private (therapist, supervisor, admin)
 */
router.put(
  '/plans/:id',
  protect,
  authorize('therapist', 'supervisor', 'admin', 'super_admin', 'doctor'),
  IndependentLivingController.updatePlan
);

/**
 * @route   DELETE /api/independent-living/plans/:id
 * @desc    حذف خطة تدريب
 * @access  Private (admin)
 */
router.delete(
  '/plans/:id',
  protect,
  authorize('admin', 'super_admin'),
  IndependentLivingController.deletePlan
);

/**
 * @route   POST /api/independent-living/plans/:id/sessions
 * @desc    إضافة جلسة تدريب
 * @access  Private (therapist, supervisor, admin, teacher)
 */
router.post(
  '/plans/:id/sessions',
  protect,
  authorize('therapist', 'supervisor', 'admin', 'super_admin', 'teacher'),
  IndependentLivingController.addSession
);

/**
 * @route   PUT /api/independent-living/plans/:planId/goals/:goalId
 * @desc    تحديث هدف تدريبي
 * @access  Private (therapist, supervisor, admin, teacher)
 */
router.put(
  '/plans/:planId/goals/:goalId',
  protect,
  authorize('therapist', 'supervisor', 'admin', 'super_admin', 'teacher'),
  IndependentLivingController.updateGoal
);

/**
 * @route   POST /api/independent-living/plans/:id/reviews
 * @desc    إضافة مراجعة لخطة تدريب
 * @access  Private (supervisor, admin)
 */
router.post(
  '/plans/:id/reviews',
  protect,
  authorize('supervisor', 'admin', 'super_admin'),
  IndependentLivingController.addPlanReview
);

// ═══════════════════════════════════════════════════════
//  تتبع التقدم نحو الاستقلالية
// ═══════════════════════════════════════════════════════

/**
 * @route   GET /api/independent-living/progress/timeline/:beneficiaryId
 * @desc    منحنى تقدم مستفيد
 * @access  Private
 */
router.get(
  '/progress/timeline/:beneficiaryId',
  protect,
  IndependentLivingController.getProgressTimeline
);

/**
 * @route   POST /api/independent-living/progress
 * @desc    تسجيل تقدم فترة جديدة
 * @access  Private (therapist, supervisor, admin)
 */
router.post(
  '/progress',
  protect,
  authorize('therapist', 'supervisor', 'admin', 'super_admin', 'doctor'),
  IndependentLivingController.recordProgress
);

/**
 * @route   GET /api/independent-living/progress
 * @desc    جلب سجلات التقدم
 * @access  Private
 */
router.get('/progress', protect, IndependentLivingController.getProgressRecords);

/**
 * @route   GET /api/independent-living/progress/:id
 * @desc    جلب سجل تقدم بالتفصيل
 * @access  Private
 */
router.get('/progress/:id', protect, IndependentLivingController.getProgressById);

/**
 * @route   PUT /api/independent-living/progress/:id
 * @desc    تحديث سجل تقدم
 * @access  Private (therapist, supervisor, admin)
 */
router.put(
  '/progress/:id',
  protect,
  authorize('therapist', 'supervisor', 'admin', 'super_admin', 'doctor'),
  IndependentLivingController.updateProgress
);

/**
 * @route   DELETE /api/independent-living/progress/:id
 * @desc    حذف سجل تقدم
 * @access  Private (admin)
 */
router.delete(
  '/progress/:id',
  protect,
  authorize('admin', 'super_admin'),
  IndependentLivingController.deleteProgress
);

// ═══════════════════════════════════════════════════════
//  برامج الإسكان المدعوم
// ═══════════════════════════════════════════════════════

/**
 * @route   POST /api/independent-living/housing
 * @desc    إنشاء برنامج إسكان مدعوم
 * @access  Private (supervisor, admin)
 */
router.post(
  '/housing',
  protect,
  authorize('supervisor', 'admin', 'super_admin', 'manager'),
  IndependentLivingController.createHousingProgram
);

/**
 * @route   GET /api/independent-living/housing
 * @desc    جلب برامج الإسكان
 * @access  Private
 */
router.get('/housing', protect, IndependentLivingController.getHousingPrograms);

/**
 * @route   GET /api/independent-living/housing/:id
 * @desc    جلب برنامج إسكان بالتفصيل
 * @access  Private
 */
router.get('/housing/:id', protect, IndependentLivingController.getHousingProgramById);

/**
 * @route   PUT /api/independent-living/housing/:id
 * @desc    تحديث برنامج إسكان
 * @access  Private (supervisor, admin)
 */
router.put(
  '/housing/:id',
  protect,
  authorize('supervisor', 'admin', 'super_admin', 'manager'),
  IndependentLivingController.updateHousingProgram
);

/**
 * @route   DELETE /api/independent-living/housing/:id
 * @desc    حذف برنامج إسكان
 * @access  Private (admin)
 */
router.delete(
  '/housing/:id',
  protect,
  authorize('admin', 'super_admin'),
  IndependentLivingController.deleteHousingProgram
);

/**
 * @route   POST /api/independent-living/housing/:id/readiness
 * @desc    إضافة تقييم جاهزية سكن
 * @access  Private (therapist, supervisor, admin)
 */
router.post(
  '/housing/:id/readiness',
  protect,
  authorize('therapist', 'supervisor', 'admin', 'super_admin', 'doctor'),
  IndependentLivingController.addReadinessAssessment
);

/**
 * @route   POST /api/independent-living/housing/:id/home-visits
 * @desc    إضافة زيارة منزلية
 * @access  Private (supervisor, admin, social_worker)
 */
router.post(
  '/housing/:id/home-visits',
  protect,
  authorize('supervisor', 'admin', 'super_admin', 'manager'),
  IndependentLivingController.addHomeVisit
);

/**
 * @route   POST /api/independent-living/housing/:id/satisfaction
 * @desc    إضافة استبيان رضا المستفيد
 * @access  Private
 */
router.post(
  '/housing/:id/satisfaction',
  protect,
  IndependentLivingController.addSatisfactionSurvey
);

module.exports = router;
