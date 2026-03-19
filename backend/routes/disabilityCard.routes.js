/**
 * Disability Card & Classification Routes
 * مسارات بطاقة ذوي الإعاقة والتصنيف
 *
 * Endpoints:
 *   CRUD:
 *     POST   /                          إنشاء بطاقة
 *     GET    /                          قائمة البطاقات
 *     GET    /stats                     لوحة المعلومات / الإحصائيات
 *     GET    /:id                       بطاقة بالمعرف
 *     PUT    /:id                       تحديث بطاقة
 *     GET    /by-national-id/:nid       بحث بالهوية
 *     GET    /by-card-number/:num       بحث برقم البطاقة
 *
 *   Lifecycle:
 *     POST   /:id/approve               اعتماد البطاقة
 *     POST   /:id/suspend               إيقاف مؤقت
 *     POST   /:id/reactivate            إعادة تفعيل
 *     POST   /:id/revoke                إلغاء
 *
 *   Classification:
 *     PUT    /:id/classification         تحديث التصنيف
 *
 *   Renewal:
 *     POST   /:id/renew                  طلب تجديد
 *     POST   /:id/renewals/:rid/approve  اعتماد تجديد
 *     GET    /renewals/due               بطاقات مستحقة التجديد
 *     POST   /renewals/process-auto      معالجة التجديد التلقائي
 *     POST   /renewals/send-reminders    إرسال تذكيرات التجديد
 *
 *   Exemptions:
 *     GET    /:id/exemptions             قائمة الإعفاءات
 *     POST   /:id/exemptions             إضافة إعفاء
 *     PUT    /:id/exemptions/:eid        تحديث إعفاء
 *     DELETE /:id/exemptions/:eid        إلغاء إعفاء
 *
 *   MOHR Integration:
 *     POST   /:id/mohr/register          تسجيل بالوزارة
 *     POST   /:id/mohr/verify            التحقق من الوزارة
 *     POST   /:id/mohr/sync              مزامنة الوزارة
 *
 *   Absher Integration:
 *     POST   /:id/absher/link            ربط أبشر
 *     POST   /:id/absher/verify          التحقق من أبشر
 *     POST   /:id/absher/sync-services   مزامنة خدمات أبشر
 *
 *   Social Security:
 *     POST   /:id/social-security/register   تسجيل ضمان اجتماعي
 *     POST   /:id/social-security/sync       مزامنة ضمان اجتماعي
 *
 *   Audit:
 *     GET    /:id/audit-log              سجل المراجعة
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const disabilityCardService = require('../services/disabilityCard.service');

// ── Helpers ───────────────────────────────────────────────────────────────────

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const getUserId = req => req.user?._id || req.user?.id || req.user?.userId;

// ── Auth: all routes require authentication ───────────────────────────────────
router.use(authenticate);

// ═══════════════════════════════════════════════════════════════════════════════
//  CRUD ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST / — إنشاء بطاقة إعاقة جديدة
 */
router.post(
  '/',
  authorize(['admin', 'hr_manager', 'social_worker', 'disability_specialist']),
  asyncHandler(async (req, res) => {
    const card = await disabilityCardService.createCard(req.body, getUserId(req));
    res.status(201).json({
      success: true,
      message: 'تم إنشاء بطاقة الإعاقة بنجاح',
      data: card,
    });
  })
);

/**
 * GET / — قائمة البطاقات مع فلاتر
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await disabilityCardService.listCards(req.query);
    res.json({
      success: true,
      data: result.data,
      count: result.data.length,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    });
  })
);

/**
 * GET /stats — إحصائيات ولوحة معلومات
 */
router.get(
  '/stats',
  authorize(['admin', 'hr_manager', 'social_worker', 'disability_specialist', 'manager']),
  asyncHandler(async (req, res) => {
    const dashboard = await disabilityCardService.getDashboard(req.query);
    res.json({
      success: true,
      message: 'إحصائيات بطاقات الإعاقة',
      data: dashboard,
    });
  })
);

/**
 * GET /by-national-id/:nationalId — بحث بالهوية الوطنية
 */
router.get(
  '/by-national-id/:nationalId',
  asyncHandler(async (req, res) => {
    const card = await disabilityCardService.getCardByNationalId(req.params.nationalId);
    if (!card) {
      return res.status(404).json({ success: false, message: 'لا توجد بطاقة لهذا الرقم الوطني' });
    }
    res.json({ success: true, data: card });
  })
);

/**
 * GET /by-card-number/:cardNumber — بحث برقم البطاقة
 */
router.get(
  '/by-card-number/:cardNumber',
  asyncHandler(async (req, res) => {
    const card = await disabilityCardService.getCardByNumber(req.params.cardNumber);
    if (!card) {
      return res.status(404).json({ success: false, message: 'رقم البطاقة غير موجود' });
    }
    res.json({ success: true, data: card });
  })
);

/**
 * GET /:id — بطاقة بالمعرف
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const card = await disabilityCardService.getCardById(req.params.id);
    res.json({ success: true, data: card });
  })
);

/**
 * PUT /:id — تحديث بطاقة
 */
router.put(
  '/:id',
  authorize(['admin', 'hr_manager', 'social_worker', 'disability_specialist']),
  asyncHandler(async (req, res) => {
    const card = await disabilityCardService.updateCard(req.params.id, req.body, getUserId(req));
    res.json({
      success: true,
      message: 'تم تحديث بيانات البطاقة',
      data: card,
    });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
//  LIFECYCLE ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /:id/approve — اعتماد البطاقة
 */
router.post(
  '/:id/approve',
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const card = await disabilityCardService.approveCard(req.params.id, getUserId(req));
    res.json({
      success: true,
      message: 'تم اعتماد البطاقة وتفعيلها',
      data: card,
    });
  })
);

/**
 * POST /:id/suspend — إيقاف مؤقت
 */
router.post(
  '/:id/suspend',
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const card = await disabilityCardService.suspendCard(
      req.params.id,
      getUserId(req),
      req.body.reason
    );
    res.json({
      success: true,
      message: 'تم إيقاف البطاقة مؤقتاً',
      data: card,
    });
  })
);

/**
 * POST /:id/reactivate — إعادة تفعيل
 */
router.post(
  '/:id/reactivate',
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const card = await disabilityCardService.reactivateCard(req.params.id, getUserId(req));
    res.json({
      success: true,
      message: 'تم إعادة تفعيل البطاقة',
      data: card,
    });
  })
);

/**
 * POST /:id/revoke — إلغاء البطاقة
 */
router.post(
  '/:id/revoke',
  authorize(['admin']),
  asyncHandler(async (req, res) => {
    const card = await disabilityCardService.revokeCard(
      req.params.id,
      getUserId(req),
      req.body.reason
    );
    res.json({
      success: true,
      message: 'تم إلغاء البطاقة',
      data: card,
    });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
//  CLASSIFICATION ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * PUT /:id/classification — تحديث التصنيف
 */
router.put(
  '/:id/classification',
  authorize(['admin', 'hr_manager', 'disability_specialist']),
  asyncHandler(async (req, res) => {
    const card = await disabilityCardService.updateClassification(
      req.params.id,
      req.body,
      getUserId(req)
    );
    res.json({
      success: true,
      message: 'تم تحديث تصنيف الإعاقة',
      data: card,
    });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
//  RENEWAL ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /renewals/due — بطاقات مستحقة التجديد
 */
router.get(
  '/renewals/due',
  authorize(['admin', 'hr_manager', 'social_worker']),
  asyncHandler(async (req, res) => {
    const daysAhead = parseInt(req.query.days) || 90;
    const cards = await disabilityCardService.getCardsDueForRenewal(daysAhead);
    res.json({
      success: true,
      message: `بطاقات مستحقة التجديد خلال ${daysAhead} يوم`,
      data: cards,
      count: cards.length,
    });
  })
);

/**
 * POST /renewals/process-auto — معالجة التجديد التلقائي (دفعة)
 */
router.post(
  '/renewals/process-auto',
  authorize(['admin']),
  asyncHandler(async (req, res) => {
    const result = await disabilityCardService.processAutoRenewals(getUserId(req));
    res.json({
      success: true,
      message: `تم معالجة التجديد التلقائي: ${result.renewed} بطاقة مجددة`,
      data: result,
    });
  })
);

/**
 * POST /renewals/send-reminders — إرسال تذكيرات التجديد
 */
router.post(
  '/renewals/send-reminders',
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const result = await disabilityCardService.sendRenewalReminders();
    res.json({
      success: true,
      message: `تم إرسال ${result.sent} تذكير`,
      data: result,
    });
  })
);

/**
 * POST /:id/renew — طلب تجديد
 */
router.post(
  '/:id/renew',
  authorize(['admin', 'hr_manager', 'social_worker', 'disability_specialist']),
  asyncHandler(async (req, res) => {
    const card = await disabilityCardService.renewCard(req.params.id, req.body, getUserId(req));
    res.json({
      success: true,
      message: 'تم تقديم طلب التجديد',
      data: card,
    });
  })
);

/**
 * POST /:id/renewals/:renewalId/approve — اعتماد التجديد
 */
router.post(
  '/:id/renewals/:renewalId/approve',
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const card = await disabilityCardService.approveRenewal(
      req.params.id,
      req.params.renewalId,
      getUserId(req)
    );
    res.json({
      success: true,
      message: 'تم اعتماد التجديد',
      data: card,
    });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
//  EXEMPTIONS ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /:id/exemptions — قائمة الإعفاءات
 */
router.get(
  '/:id/exemptions',
  asyncHandler(async (req, res) => {
    const exemptions = await disabilityCardService.getExemptions(req.params.id);
    res.json({
      success: true,
      data: exemptions,
    });
  })
);

/**
 * POST /:id/exemptions — إضافة إعفاء
 */
router.post(
  '/:id/exemptions',
  authorize(['admin', 'hr_manager', 'social_worker', 'disability_specialist']),
  asyncHandler(async (req, res) => {
    const card = await disabilityCardService.addExemption(req.params.id, req.body, getUserId(req));
    res.json({
      success: true,
      message: 'تم إضافة الإعفاء',
      data: card,
    });
  })
);

/**
 * PUT /:id/exemptions/:exemptionId — تحديث إعفاء
 */
router.put(
  '/:id/exemptions/:exemptionId',
  authorize(['admin', 'hr_manager', 'social_worker']),
  asyncHandler(async (req, res) => {
    const card = await disabilityCardService.updateExemption(
      req.params.id,
      req.params.exemptionId,
      req.body,
      getUserId(req)
    );
    res.json({
      success: true,
      message: 'تم تحديث الإعفاء',
      data: card,
    });
  })
);

/**
 * DELETE /:id/exemptions/:exemptionId — إلغاء إعفاء
 */
router.delete(
  '/:id/exemptions/:exemptionId',
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const card = await disabilityCardService.removeExemption(
      req.params.id,
      req.params.exemptionId,
      getUserId(req),
      req.body.reason
    );
    res.json({
      success: true,
      message: 'تم إلغاء الإعفاء',
      data: card,
    });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
//  MOHR INTEGRATION ENDPOINTS (وزارة الموارد البشرية)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /:id/mohr/register — تسجيل في وزارة الموارد البشرية
 */
router.post(
  '/:id/mohr/register',
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const result = await disabilityCardService.registerWithMOHR(req.params.id, getUserId(req));
    res.json({
      success: true,
      message: 'تم التسجيل في نظام بطاقة الإعاقة الوطنية',
      data: result,
    });
  })
);

/**
 * POST /:id/mohr/verify — التحقق من حالة الوزارة
 */
router.post(
  '/:id/mohr/verify',
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const result = await disabilityCardService.verifyMOHRStatus(req.params.id, getUserId(req));
    res.json({
      success: true,
      message: result.verified ? 'تم التحقق بنجاح' : 'التحقق مرفوض',
      data: result,
    });
  })
);

/**
 * POST /:id/mohr/sync — مزامنة بيانات الوزارة
 */
router.post(
  '/:id/mohr/sync',
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const result = await disabilityCardService.syncWithMOHR(req.params.id, getUserId(req));
    res.json({
      success: true,
      message: 'تم مزامنة بيانات وزارة الموارد البشرية',
      data: result,
    });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
//  ABSHER INTEGRATION ENDPOINTS (أبشر)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /:id/absher/link — ربط مع أبشر
 */
router.post(
  '/:id/absher/link',
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const result = await disabilityCardService.linkWithAbsher(
      req.params.id,
      req.body,
      getUserId(req)
    );
    res.json({
      success: true,
      message: 'تم الربط مع منصة أبشر',
      data: result,
    });
  })
);

/**
 * POST /:id/absher/verify — التحقق من أبشر
 */
router.post(
  '/:id/absher/verify',
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const result = await disabilityCardService.verifyAbsherStatus(req.params.id, getUserId(req));
    res.json({
      success: true,
      message: result.verified ? 'تم التحقق من أبشر' : 'فشل التحقق من أبشر',
      data: result,
    });
  })
);

/**
 * POST /:id/absher/sync-services — مزامنة خدمات أبشر
 */
router.post(
  '/:id/absher/sync-services',
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const result = await disabilityCardService.syncAbsherServices(req.params.id, getUserId(req));
    res.json({
      success: true,
      message: 'تم مزامنة خدمات أبشر',
      data: result,
    });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
//  SOCIAL SECURITY ENDPOINTS (الضمان الاجتماعي)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /:id/social-security/register — تسجيل في الضمان الاجتماعي
 */
router.post(
  '/:id/social-security/register',
  authorize(['admin', 'hr_manager', 'social_worker']),
  asyncHandler(async (req, res) => {
    const result = await disabilityCardService.registerSocialSecurity(
      req.params.id,
      req.body,
      getUserId(req)
    );
    res.json({
      success: true,
      message: 'تم التسجيل في الضمان الاجتماعي',
      data: result,
    });
  })
);

/**
 * POST /:id/social-security/sync — مزامنة الضمان الاجتماعي
 */
router.post(
  '/:id/social-security/sync',
  authorize(['admin', 'hr_manager', 'social_worker']),
  asyncHandler(async (req, res) => {
    const result = await disabilityCardService.syncSocialSecurity(req.params.id, getUserId(req));
    res.json({
      success: true,
      message: 'تم مزامنة بيانات الضمان الاجتماعي',
      data: result,
    });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
//  AUDIT LOG
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /:id/audit-log — سجل المراجعة
 */
router.get(
  '/:id/audit-log',
  authorize(['admin', 'hr_manager', 'auditor']),
  asyncHandler(async (req, res) => {
    const auditLog = await disabilityCardService.getAuditLog(req.params.id);
    res.json({
      success: true,
      data: auditLog,
      count: auditLog.length,
    });
  })
);

// ── Error handler ─────────────────────────────────────────────────────────────
router.use((err, req, res, _next) => {
  logger.error('[DisabilityCard Route Error]', err);
  const status = err.message?.includes('غير موجود') ? 404 : 500;
  res.status(status).json({
    success: false,
    message: err.message || 'حدث خطأ في نظام بطاقات الإعاقة',
  });
});

module.exports = router;
