/**
 * مسارات تقارير هيئة رعاية ذوي الإعاقة + معايير CBAHI
 * Disability Authority Reports & CBAHI Standards Routes
 */

const express = require('express');
const router = express.Router();
const DisabilityAuthorityService = require('../services/disabilityAuthority.service');
const { authenticateToken, authorize } = require('../middleware/auth');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const AUTHORITY_ROLES = [
  'admin',
  'center_manager',
  'quality_manager',
  'quality_officer',
  'social_worker',
];

// ============================================================
// تقارير هيئة رعاية ذوي الإعاقة
// ============================================================

// إنشاء تقرير جديد
router.post(
  '/reports',
  authenticateToken,
  authorize(AUTHORITY_ROLES),
  asyncHandler(async (req, res) => {
    const report = await DisabilityAuthorityService.createReport(
      req.body,
      req.user.id || req.user._id
    );
    res.status(201).json({ success: true, data: report });
  })
);

// جلب جميع التقارير
router.get(
  '/reports',
  authenticateToken,
  authorize(AUTHORITY_ROLES),
  asyncHandler(async (req, res) => {
    const result = await DisabilityAuthorityService.getReports(req.query);
    res.json({ success: true, data: result });
  })
);

// جلب تقرير واحد
router.get(
  '/reports/:id',
  authenticateToken,
  authorize(AUTHORITY_ROLES),
  asyncHandler(async (req, res) => {
    const report = await DisabilityAuthorityService.getReportById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'التقرير غير موجود' });
    res.json({ success: true, data: report });
  })
);

// تحديث تقرير
router.put(
  '/reports/:id',
  authenticateToken,
  authorize(AUTHORITY_ROLES),
  asyncHandler(async (req, res) => {
    const report = await DisabilityAuthorityService.updateReport(
      req.params.id,
      req.body,
      req.user.id || req.user._id
    );
    res.json({ success: true, data: report });
  })
);

// مراجعة / اعتماد / تقديم تقرير
router.post(
  '/reports/:id/review',
  authenticateToken,
  authorize(['admin', 'center_manager', 'quality_manager']),
  asyncHandler(async (req, res) => {
    const { action, feedback } = req.body;
    const report = await DisabilityAuthorityService.reviewReport(
      req.params.id,
      action,
      req.user.id || req.user._id,
      feedback
    );
    res.json({ success: true, data: report });
  })
);

// توليد بيانات التقرير تلقائياً من النظام
router.post(
  '/reports/generate',
  authenticateToken,
  authorize(AUTHORITY_ROLES),
  asyncHandler(async (req, res) => {
    const { reportType, branch, startDate, endDate } = req.body;
    const data = await DisabilityAuthorityService.generateReportData(
      reportType,
      branch,
      startDate,
      endDate
    );
    res.json({ success: true, data });
  })
);

// لوحة معلومات تقارير الهيئة
router.get(
  '/dashboard',
  authenticateToken,
  authorize(AUTHORITY_ROLES),
  asyncHandler(async (req, res) => {
    const data = await DisabilityAuthorityService.getDashboard(req.query.branch);
    res.json({ success: true, data });
  })
);

// ============================================================
// معايير CBAHI
// ============================================================

// جلب معايير CBAHI
router.get(
  '/cbahi/standards',
  authenticateToken,
  authorize(AUTHORITY_ROLES),
  asyncHandler(async (req, res) => {
    const standards = await DisabilityAuthorityService.getStandards(req.query);
    res.json({ success: true, data: standards });
  })
);

// إضافة / تحديث معيار CBAHI
router.post(
  '/cbahi/standards',
  authenticateToken,
  authorize(['admin', 'quality_manager']),
  asyncHandler(async (req, res) => {
    const standard = await DisabilityAuthorityService.upsertStandard(req.body);
    res.json({ success: true, data: standard });
  })
);

// تهيئة المعايير الافتراضية
router.post(
  '/cbahi/standards/seed',
  authenticateToken,
  authorize(['admin']),
  asyncHandler(async (req, res) => {
    const result = await DisabilityAuthorityService.seedDefaultStandards();
    res.json({ success: true, data: { message: 'تم تهيئة المعايير بنجاح', result } });
  })
);

// ============================================================
// تقييمات الامتثال CBAHI
// ============================================================

// إنشاء تقييم جديد
router.post(
  '/cbahi/assessments',
  authenticateToken,
  authorize(AUTHORITY_ROLES),
  asyncHandler(async (req, res) => {
    const assessment = await DisabilityAuthorityService.createAssessment(
      req.body,
      req.user.id || req.user._id
    );
    res.status(201).json({ success: true, data: assessment });
  })
);

// جلب التقييمات
router.get(
  '/cbahi/assessments',
  authenticateToken,
  authorize(AUTHORITY_ROLES),
  asyncHandler(async (req, res) => {
    const result = await DisabilityAuthorityService.getAssessments(req.query);
    res.json({ success: true, data: result });
  })
);

// جلب تقييم واحد
router.get(
  '/cbahi/assessments/:id',
  authenticateToken,
  authorize(AUTHORITY_ROLES),
  asyncHandler(async (req, res) => {
    const assessment = await DisabilityAuthorityService.getAssessmentById(req.params.id);
    if (!assessment) return res.status(404).json({ success: false, message: 'التقييم غير موجود' });
    res.json({ success: true, data: assessment });
  })
);

// تحديث نتيجة معيار في تقييم
router.put(
  '/cbahi/assessments/:id/standards/:code',
  authenticateToken,
  authorize(AUTHORITY_ROLES),
  asyncHandler(async (req, res) => {
    const assessment = await DisabilityAuthorityService.updateStandardResult(
      req.params.id,
      req.params.code,
      req.body
    );
    res.json({ success: true, data: assessment });
  })
);

// إتمام التقييم
router.post(
  '/cbahi/assessments/:id/complete',
  authenticateToken,
  authorize(['admin', 'quality_manager']),
  asyncHandler(async (req, res) => {
    const assessment = await DisabilityAuthorityService.completeAssessment(
      req.params.id,
      req.user.id || req.user._id
    );
    res.json({ success: true, data: assessment });
  })
);

// لوحة معلومات CBAHI
router.get(
  '/cbahi/dashboard',
  authenticateToken,
  authorize(AUTHORITY_ROLES),
  asyncHandler(async (req, res) => {
    const data = await DisabilityAuthorityService.getCBAHIDashboard(req.query.branch);
    res.json({ success: true, data });
  })
);

module.exports = router;
