/**
 * Case Management Routes
 * مسارات نظام إدارة الحالات
 *
 * @description تعريف جميع endpoints لإدارة الحالات
 * @version 1.0.0
 * @date 2026-01-30
 */

const express = require('express');
const router = express.Router();
const caseController = require('../controllers/case.controller');

// Middleware للمصادقة والتفويض (يجب تفعيلها في الإنتاج)
// const { authenticate } = require('../middleware/auth');
// const { authorize } = require('../middleware/rbac');

// استخدام middleware للمصادقة على جميع المسارات
// router.use(authenticate);

/**
 * @route   POST /api/cases
 * @desc    إنشاء حالة جديدة
 * @access  Private (case_manager, medical_director, center_director)
 */
router.post(
  '/',
  // authorize(['case_manager', 'medical_director', 'center_director']),
  caseController.createCase
);

/**
 * @route   GET /api/cases
 * @desc    الحصول على قائمة الحالات مع فلترة وترتيب
 * @access  Private (All authenticated users)
 * @query   status, priority, disabilityType, severity, riskLevel, teamMember,
 *          beneficiaryId, isActive, isArchived, dateFrom, dateTo,
 *          page, limit, sortBy, sortOrder
 */
router.get('/', caseController.getCases);

/**
 * @route   GET /api/cases/statistics
 * @desc    الحصول على إحصائيات الحالات
 * @access  Private (case_manager, medical_director, center_director)
 */
router.get(
  '/statistics',
  // authorize(['case_manager', 'medical_director', 'center_director']),
  caseController.getStatistics
);

/**
 * @route   GET /api/cases/search
 * @desc    البحث المتقدم عن الحالات
 * @access  Private (All authenticated users)
 */
router.get('/search', caseController.advancedSearch);

/**
 * @route   GET /api/cases/critical
 * @desc    الحصول على الحالات الحرجة التي تحتاج اهتمام فوري
 * @access  Private (case_manager, medical_director, center_director)
 */
router.get(
  '/critical',
  // authorize(['case_manager', 'medical_director', 'center_director']),
  caseController.getCriticalCases
);

/**
 * @route   GET /api/cases/pending
 * @desc    الحصول على الحالات المعلقة التي تحتاج مراجعة
 * @access  Private (case_manager, medical_director, center_director)
 */
router.get(
  '/pending',
  // authorize(['case_manager', 'medical_director', 'center_director']),
  caseController.getPendingCases
);

/**
 * @route   GET /api/cases/:id
 * @desc    الحصول على تفاصيل حالة محددة
 * @access  Private (All authenticated users with access to case)
 */
router.get('/:id', caseController.getCaseById);

/**
 * @route   PUT /api/cases/:id
 * @desc    تحديث بيانات حالة
 * @access  Private (case_manager, assigned team members)
 */
router.put(
  '/:id',
  // authorize(['case_manager', 'therapist', 'medical_director']),
  caseController.updateCase
);

/**
 * @route   POST /api/cases/:id/status
 * @desc    تغيير حالة القبول
 * @access  Private (case_manager, medical_director, center_director)
 */
router.post(
  '/:id/status',
  // authorize(['case_manager', 'medical_director', 'center_director']),
  caseController.changeStatus
);

/**
 * @route   POST /api/cases/:id/assign
 * @desc    تعيين فريق معالج للحالة
 * @access  Private (case_manager, medical_director)
 */
router.post(
  '/:id/assign',
  // authorize(['case_manager', 'medical_director']),
  caseController.assignTeam
);

/**
 * @route   DELETE /api/cases/:id/team/:memberId
 * @desc    إزالة عضو من الفريق المعالج
 * @access  Private (case_manager, medical_director)
 */
router.delete(
  '/:id/team/:memberId',
  // authorize(['case_manager', 'medical_director']),
  caseController.removeTeamMember
);

/**
 * @route   POST /api/cases/:id/iep
 * @desc    إنشاء أو تحديث الخطة التربوية الفردية (IEP)
 * @access  Private (case_manager, assigned team members)
 */
router.post(
  '/:id/iep',
  // authorize(['case_manager', 'therapist', 'special_educator', 'psychologist']),
  caseController.createOrUpdateIEP
);

/**
 * @route   POST /api/cases/:id/iep/approve
 * @desc    اعتماد الخطة التربوية الفردية
 * @access  Private (medical_director, center_director)
 */
router.post(
  '/:id/iep/approve',
  // authorize(['medical_director', 'center_director']),
  caseController.approveIEP
);

/**
 * @route   POST /api/cases/:id/notes
 * @desc    إضافة ملاحظة للحالة
 * @access  Private (assigned team members)
 */
router.post(
  '/:id/notes',
  // authorize(['case_manager', 'therapist', 'psychologist', 'social_worker', 'special_educator', 'nurse']),
  caseController.addNote
);

/**
 * @route   GET /api/cases/:id/history
 * @desc    الحصول على تاريخ الحالة (الملاحظات والخطط السابقة)
 * @access  Private (assigned team members, case_manager)
 */
router.get('/:id/history', caseController.getCaseHistory);

/**
 * @route   GET /api/cases/:id/progress-report
 * @desc    الحصول على تقرير التقدم الشامل
 * @access  Private (All authenticated users with access to case)
 */
router.get('/:id/progress-report', caseController.getProgressReport);

/**
 * @route   POST /api/cases/:id/archive
 * @desc    أرشفة حالة
 * @access  Private (case_manager, medical_director, center_director)
 */
router.post(
  '/:id/archive',
  // authorize(['case_manager', 'medical_director', 'center_director']),
  caseController.archiveCase
);

/**
 * @route   POST /api/cases/:id/unarchive
 * @desc    استعادة حالة من الأرشيف
 * @access  Private (case_manager, medical_director, center_director)
 */
router.post(
  '/:id/unarchive',
  // authorize(['case_manager', 'medical_director', 'center_director']),
  caseController.unarchiveCase
);

/**
 * @route   DELETE /api/cases/:id
 * @desc    حذف حالة (أرشفة فعلياً)
 * @access  Private (super_admin, center_director only)
 */
router.delete(
  '/:id',
  // authorize(['super_admin', 'center_director']),
  caseController.deleteCase
);

module.exports = router;
