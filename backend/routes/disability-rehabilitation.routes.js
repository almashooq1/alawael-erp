/**
 * Disability Rehabilitation Routes
 * مسارات API لنظام تأهيل ذوي الإعاقة
 *
 * @module routes/disability-rehabilitation
 * @description API Endpoints لإدارة برامج التأهيل
 * @version 1.0.0
 * @date 2026-01-19
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/disability-rehabilitation.controller');

// Middleware (basic auth only for tests)
const { authenticateToken } = require('../middleware/auth.middleware');

// ============================================
// برامج التأهيل - Programs
// ============================================

/**
 * @route   POST /api/v1/disability-rehabilitation/programs
 * @desc    إنشاء برنامج تأهيل جديد
 * @access  Private (Admins, Therapists)
 */
router.post('/programs', authenticateToken, controller.createProgram);

/**
 * @route   GET /api/v1/disability-rehabilitation/programs
 * @desc    الحصول على جميع البرامج مع الفلترة
 * @access  Private
 * @query   disability_type, status, beneficiary_id, severity, date_from, date_to, search, page, limit, sort
 */
router.get('/programs', authenticateToken, controller.getAllPrograms);

/**
 * @route   GET /api/v1/disability-rehabilitation/programs/:id
 * @desc    الحصول على برنامج محدد
 * @access  Private
 */
router.get('/programs/:id', authenticateToken, controller.getProgramById);

/**
 * @route   PUT /api/v1/disability-rehabilitation/programs/:id
 * @desc    تحديث برنامج التأهيل
 * @access  Private (Admins, Therapists, Case Managers)
 */
router.put('/programs/:id', authenticateToken, controller.updateProgram);

/**
 * @route   DELETE /api/v1/disability-rehabilitation/programs/:id
 * @desc    حذف برنامج (soft delete)
 * @access  Private (Admins only)
 */
router.delete('/programs/:id', authenticateToken, controller.deleteProgram);

// ============================================
// الجلسات - Sessions
// ============================================

/**
 * @route   POST /api/v1/disability-rehabilitation/programs/:id/sessions
 * @desc    إضافة جلسة جديدة
 * @access  Private (Therapists, Case Managers)
 */
router.post('/programs/:id/sessions', authenticateToken, controller.addSession);

// ============================================
// الأهداف - Goals
// ============================================

/**
 * @route   PUT /api/v1/disability-rehabilitation/programs/:id/goals/:goalId
 * @desc    تحديث حالة هدف
 * @access  Private (Therapists, Case Managers)
 */
router.put('/programs/:id/goals/:goalId', authenticateToken, controller.updateGoalStatus);

// ============================================
// التقييمات - Assessments
// ============================================

/**
 * @route   POST /api/v1/disability-rehabilitation/programs/:id/assessments
 * @desc    إضافة تقييم
 * @access  Private (Therapists, Assessors)
 */
router.post('/programs/:id/assessments', authenticateToken, controller.addAssessment);

// ============================================
// إدارة البرنامج - Program Management
// ============================================

/**
 * @route   PUT /api/v1/disability-rehabilitation/programs/:id/complete
 * @desc    إنهاء البرنامج
 * @access  Private (Admins, Case Managers)
 */
router.put('/programs/:id/complete', authenticateToken, controller.completeProgram);

// ============================================
// الإحصائيات والتقارير - Statistics & Reports
// ============================================

/**
 * @route   GET /api/v1/disability-rehabilitation/statistics
 * @desc    إحصائيات عامة
 * @access  Private (Admins, Managers)
 * @query   date_from, date_to
 */
router.get('/statistics', authenticateToken, controller.getStatistics);

/**
 * @route   GET /api/v1/disability-rehabilitation/performance/:year/:month
 * @desc    تقرير الأداء الشهري
 * @access  Private (Admins, Managers)
 */
router.get('/performance/:year/:month', authenticateToken, controller.getMonthlyPerformance);

/**
 * @route   GET /api/v1/disability-rehabilitation/programs/:id/report
 * @desc    تقرير تفصيلي عن برنامج
 * @access  Private
 */
router.get('/programs/:id/report', authenticateToken, controller.getDetailedReport);

// ============================================
// برامج المستفيد - Beneficiary Programs
// ============================================

/**
 * @route   GET /api/v1/disability-rehabilitation/beneficiary/:beneficiaryId/programs
 * @desc    الحصول على برامج المستفيد
 * @access  Private
 */
router.get(
  '/beneficiary/:beneficiaryId/programs',
  authenticateToken,
  controller.getBeneficiaryPrograms
);

// ============================================
// معلومات إضافية - Additional Info
// ============================================

/**
 * @route   GET /api/v1/disability-rehabilitation/info
 * @desc    معلومات عن النظام
 * @access  Public
 */
router.get('/info', (req, res) => {
  res.json({
    success: true,
    data: {
      system_name: 'نظام تأهيل ذوي الإعاقة',
      system_name_en: 'Disability Rehabilitation System',
      version: '1.0.0',
      description: 'نظام شامل لإدارة برامج تأهيل ذوي الإعاقة',
      features: [
        'إدارة برامج التأهيل',
        'تتبع الجلسات والحضور',
        'إدارة الأهداف التأهيلية',
        'التقييمات الدورية',
        'إشراك الأسرة',
        'الأجهزة المساعدة',
        'التقارير والإحصائيات',
        'نظام التدقيق',
      ],
      disability_types: [
        { value: 'physical', label_ar: 'إعاقة حركية', label_en: 'Physical Disability' },
        { value: 'visual', label_ar: 'إعاقة بصرية', label_en: 'Visual Impairment' },
        { value: 'hearing', label_ar: 'إعاقة سمعية', label_en: 'Hearing Impairment' },
        { value: 'intellectual', label_ar: 'إعاقة ذهنية', label_en: 'Intellectual Disability' },
        { value: 'autism', label_ar: 'اضطراب طيف التوحد', label_en: 'Autism Spectrum Disorder' },
        { value: 'learning', label_ar: 'صعوبات تعلم', label_en: 'Learning Disabilities' },
        { value: 'multiple', label_ar: 'إعاقة متعددة', label_en: 'Multiple Disabilities' },
        { value: 'speech', label_ar: 'إعاقة نطق ولغة', label_en: 'Speech and Language Disorder' },
        { value: 'behavioral', label_ar: 'اضطرابات سلوكية', label_en: 'Behavioral Disorders' },
        { value: 'developmental', label_ar: 'تأخر نمائي', label_en: 'Developmental Delay' },
      ],
      service_types: [
        { value: 'physical_therapy', label_ar: 'علاج طبيعي', label_en: 'Physical Therapy' },
        { value: 'occupational_therapy', label_ar: 'علاج وظيفي', label_en: 'Occupational Therapy' },
        { value: 'speech_therapy', label_ar: 'علاج نطق ولغة', label_en: 'Speech Therapy' },
        { value: 'behavioral_therapy', label_ar: 'علاج سلوكي', label_en: 'Behavioral Therapy' },
        { value: 'special_education', label_ar: 'تربية خاصة', label_en: 'Special Education' },
        { value: 'psychological_support', label_ar: 'دعم نفسي', label_en: 'Psychological Support' },
        { value: 'social_work', label_ar: 'خدمة اجتماعية', label_en: 'Social Work' },
        { value: 'vocational_training', label_ar: 'تدريب مهني', label_en: 'Vocational Training' },
        {
          value: 'assistive_technology',
          label_ar: 'تقنيات مساعدة',
          label_en: 'Assistive Technology',
        },
        { value: 'family_counseling', label_ar: 'إرشاد أسري', label_en: 'Family Counseling' },
      ],
    },
  });
});

module.exports = router;
