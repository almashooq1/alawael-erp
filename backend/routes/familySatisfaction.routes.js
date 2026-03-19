/**
 * مسارات استبيانات رضا الأسر
 * Family Satisfaction Survey Routes
 */

const express = require('express');
const router = express.Router();
const FamilySatisfactionService = require('../services/familySatisfaction.service');
const { authenticateToken, authorize } = require('../middleware/auth');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const SURVEY_ROLES = [
  'admin',
  'center_manager',
  'quality_manager',
  'quality_officer',
  'social_worker',
  'therapist',
];

// ============================================================
// قوالب الاستبيانات
// ============================================================

// جلب القوالب
router.get(
  '/templates',
  authenticateToken,
  authorize(SURVEY_ROLES),
  asyncHandler(async (req, res) => {
    const templates = await FamilySatisfactionService.getTemplates(req.query);
    res.json({ success: true, data: templates });
  })
);

// إنشاء قالب
router.post(
  '/templates',
  authenticateToken,
  authorize(['admin', 'quality_manager']),
  asyncHandler(async (req, res) => {
    const template = await FamilySatisfactionService.createTemplate(
      req.body,
      req.user.id || req.user._id
    );
    res.status(201).json({ success: true, data: template });
  })
);

// تهيئة القوالب الافتراضية
router.post(
  '/templates/seed',
  authenticateToken,
  authorize(['admin']),
  asyncHandler(async (req, res) => {
    const result = await FamilySatisfactionService.seedDefaultTemplates(
      req.user.id || req.user._id
    );
    res.json({ success: true, data: { message: 'تم تهيئة القوالب بنجاح', result } });
  })
);

// جلب قالب واحد
router.get(
  '/templates/:id',
  authenticateToken,
  authorize(SURVEY_ROLES),
  asyncHandler(async (req, res) => {
    const template = await FamilySatisfactionService.getTemplateById(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'القالب غير موجود' });
    res.json({ success: true, data: template });
  })
);

// تحديث قالب
router.put(
  '/templates/:id',
  authenticateToken,
  authorize(['admin', 'quality_manager']),
  asyncHandler(async (req, res) => {
    const template = await FamilySatisfactionService.updateTemplate(req.params.id, req.body);
    res.json({ success: true, data: template });
  })
);

// ============================================================
// استجابات الاستبيانات
// ============================================================

// إرسال استبيان
router.post(
  '/send',
  authenticateToken,
  authorize(SURVEY_ROLES),
  asyncHandler(async (req, res) => {
    const { templateId, ...recipientData } = req.body;
    const response = await FamilySatisfactionService.sendSurvey(templateId, recipientData);
    res.status(201).json({ success: true, data: response });
  })
);

// إنشاء استجابة جديدة
router.post(
  '/responses',
  authenticateToken,
  authorize(SURVEY_ROLES),
  asyncHandler(async (req, res) => {
    const { templateId, ...data } = req.body;
    const response = await FamilySatisfactionService.createDirectResponse(templateId, data);
    res.status(201).json({ success: true, data: response });
  })
);

// تقديم إجابات (يمكن للأسرة استخدامه بدون تسجيل)
router.post(
  '/responses/:id/submit',
  asyncHandler(async (req, res) => {
    const response = await FamilySatisfactionService.submitResponse(
      req.params.id,
      req.body.answers
    );
    res.json({ success: true, data: response });
  })
);

// إنشاء استجابة مباشرة
router.post(
  '/responses/direct',
  authenticateToken,
  authorize(SURVEY_ROLES),
  asyncHandler(async (req, res) => {
    const { templateCode, ...data } = req.body;
    const response = await FamilySatisfactionService.createDirectResponse(templateCode, data);
    res.status(201).json({ success: true, data: response });
  })
);

// جلب الاستجابات
router.get(
  '/responses',
  authenticateToken,
  authorize(SURVEY_ROLES),
  asyncHandler(async (req, res) => {
    const result = await FamilySatisfactionService.getResponses(req.query);
    res.json({ success: true, data: result });
  })
);

// جلب استجابة واحدة
router.get(
  '/responses/:id',
  authenticateToken,
  authorize(SURVEY_ROLES),
  asyncHandler(async (req, res) => {
    const response = await FamilySatisfactionService.getResponseById(req.params.id);
    if (!response) return res.status(404).json({ success: false, message: 'الاستجابة غير موجودة' });
    res.json({ success: true, data: response });
  })
);

// تحديث حالة المتابعة
router.put(
  '/responses/:id/follow-up',
  authenticateToken,
  authorize(SURVEY_ROLES),
  asyncHandler(async (req, res) => {
    const response = await FamilySatisfactionService.updateFollowUp(
      req.params.id,
      req.body,
      req.user.id || req.user._id
    );
    res.json({ success: true, data: response });
  })
);

// ============================================================
// التحليلات
// ============================================================

// حساب NPS
router.get(
  '/analytics/nps',
  authenticateToken,
  authorize(SURVEY_ROLES),
  asyncHandler(async (req, res) => {
    const nps = await FamilySatisfactionService.calculateNPS(req.query);
    res.json({ success: true, data: nps });
  })
);

// توليد تقرير تحليلات
router.post(
  '/analytics/generate',
  authenticateToken,
  authorize(['admin', 'center_manager', 'quality_manager']),
  asyncHandler(async (req, res) => {
    const { startDate, endDate, branch } = req.body;
    const report = await FamilySatisfactionService.generateAnalyticsReport(
      startDate,
      endDate,
      branch,
      req.user.id || req.user._id
    );
    res.status(201).json({ success: true, data: report });
  })
);

// لوحة المعلومات
router.get(
  '/dashboard',
  authenticateToken,
  authorize(SURVEY_ROLES),
  asyncHandler(async (req, res) => {
    const data = await FamilySatisfactionService.getDashboard(req.query.branch);
    res.json({ success: true, data });
  })
);

module.exports = router;
