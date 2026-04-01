/**
 * Muqeem Full Routes — مسارات مقيم الكاملة
 *
 * تغطي جميع خدمات نظام مقيم (المديرية العامة للجوازات):
 * - إدارة الإقامات (استعلام، إصدار، تجديد)
 * - التأشيرات (خروج وعودة مفردة/متعددة، خروج نهائي، إلغاء، تمديد)
 * - نقل الخدمات (كفالة)
 * - لوحة التحكم والتقارير
 * - نظام التنبيهات
 *
 * @module routes/muqeem-full.routes
 * @version 1.0.0
 */
'use strict';

const express = require('express');
const router = express.Router();
const muqeemService = require('../services/muqeem-full.service');
const { authenticateToken, authorize } = require('../middleware/auth');

// ── Async wrapper ─────────────────────────────────────────────────────────
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ── بناء السياق من الطلب ─────────────────────────────────────────────────
const buildContext = req => ({
  userId: req.user?._id || req.user?.id,
  organizationId: req.user?.organizationId || req.user?.organization,
  ip: req.ip,
});

// =============================================================================
// لوحة التحكم والإحصائيات
// =============================================================================

/**
 * GET /api/muqeem-full/dashboard
 * إحصائيات لوحة التحكم
 */
router.get(
  '/dashboard',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const ctx = buildContext(req);
    const stats = await muqeemService.getDashboardStats(ctx.organizationId);
    res.json({ success: true, data: stats });
  })
);

// =============================================================================
// إدارة الإقامات
// =============================================================================

/**
 * GET /api/muqeem-full/residencies
 * قائمة إقامات الموظفين مع الفلاتر
 * Query: status, expiringDays, limit, skip
 */
router.get(
  '/residencies',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const ctx = buildContext(req);
    const filters = {
      ...req.query,
      organizationId: ctx.organizationId,
    };
    const data = await muqeemService.getLocalResidencies(filters);
    res.json({ success: true, data });
  })
);

/**
 * GET /api/muqeem-full/residencies/expiring
 * الإقامات المنتهية قريباً
 * Query: daysAhead (default: 90)
 */
router.get(
  '/residencies/expiring',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const daysAhead = parseInt(req.query.daysAhead || '90', 10);
    const ctx = buildContext(req);
    const data = await muqeemService.getLocalResidencies({
      status: 'active',
      expiringDays: daysAhead,
      organizationId: ctx.organizationId,
    });
    res.json({ success: true, data });
  })
);

/**
 * GET /api/muqeem-full/iqama/:iqamaNumber
 * استعلام عن إقامة من مقيم وتحديث البيانات المحلية
 */
router.get(
  '/iqama/:iqamaNumber',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const { iqamaNumber } = req.params;
    if (!/^\d{10}$/.test(iqamaNumber)) {
      return res
        .status(400)
        .json({ success: false, message: 'رقم الإقامة يجب أن يتكون من 10 أرقام' });
    }
    const ctx = buildContext(req);
    const data = await muqeemService.queryIqama(iqamaNumber, ctx);
    res.json({ success: true, data });
  })
);

/**
 * POST /api/muqeem-full/iqama/issue
 * إصدار إقامة جديدة لموظف
 * Body: { employeeId, borderNumber, passportNumber, passportCountryCode,
 *         passportIssueDate, passportExpiryDate, occupationCode, durationYears }
 */
router.post(
  '/iqama/issue',
  authenticateToken,
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const { employeeId, ...data } = req.body;
    if (!employeeId) return res.status(400).json({ success: false, message: 'employeeId مطلوب' });
    if (!data.passportNumber)
      return res.status(400).json({ success: false, message: 'passportNumber مطلوب' });
    if (!data.occupationCode)
      return res.status(400).json({ success: false, message: 'occupationCode مطلوب' });

    const ctx = buildContext(req);
    const residency = await muqeemService.issueIqama(employeeId, data, ctx);
    res.status(201).json({
      success: true,
      message: 'تم إصدار الإقامة بنجاح',
      data: residency,
    });
  })
);

/**
 * POST /api/muqeem-full/iqama/renew
 * تجديد إقامة
 * Body: { iqamaNumber, durationYears }
 */
router.post(
  '/iqama/renew',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const { iqamaNumber, durationYears = 1 } = req.body;
    if (!iqamaNumber) return res.status(400).json({ success: false, message: 'iqamaNumber مطلوب' });

    const ctx = buildContext(req);
    const residency = await muqeemService.renewIqama(iqamaNumber, durationYears, ctx);
    res.json({
      success: true,
      message: 'تم تجديد الإقامة بنجاح',
      data: residency,
    });
  })
);

/**
 * GET /api/muqeem-full/passport/:passportNumber
 * استعلام عن موظف بالجواز
 */
router.get(
  '/passport/:passportNumber',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const ctx = buildContext(req);
    const data = await muqeemService.queryByPassport(req.params.passportNumber, ctx);
    res.json({ success: true, data });
  })
);

// =============================================================================
// التأشيرات
// =============================================================================

/**
 * POST /api/muqeem-full/visa/exit-reentry
 * إصدار تأشيرة خروج وعودة
 * Body: { employeeId, type: 'single'|'multiple', durationDays, destination, purpose }
 */
router.post(
  '/visa/exit-reentry',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const { employeeId, type, durationDays, destination, purpose } = req.body;
    if (!employeeId) return res.status(400).json({ success: false, message: 'employeeId مطلوب' });
    if (!durationDays)
      return res.status(400).json({ success: false, message: 'durationDays مطلوب' });

    const ctx = buildContext(req);
    const visa = await muqeemService.issueExitReentryVisa(
      employeeId,
      { type: type || 'multiple', durationDays: parseInt(durationDays, 10), destination, purpose },
      ctx
    );
    res.status(201).json({
      success: true,
      message: 'تم إصدار تأشيرة الخروج والعودة بنجاح',
      data: visa,
    });
  })
);

/**
 * POST /api/muqeem-full/visa/final-exit
 * إصدار تأشيرة خروج نهائي
 * Body: { employeeId, reason }
 */
router.post(
  '/visa/final-exit',
  authenticateToken,
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const { employeeId, reason } = req.body;
    if (!employeeId) return res.status(400).json({ success: false, message: 'employeeId مطلوب' });

    const ctx = buildContext(req);
    const visa = await muqeemService.issueFinalExitVisa(employeeId, reason, ctx);
    res.status(201).json({
      success: true,
      message: 'تم إصدار تأشيرة الخروج النهائي بنجاح',
      data: visa,
    });
  })
);

/**
 * PUT /api/muqeem-full/visa/:visaId/cancel
 * إلغاء تأشيرة
 */
router.put(
  '/visa/:visaId/cancel',
  authenticateToken,
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const ctx = buildContext(req);
    const visa = await muqeemService.cancelVisa(req.params.visaId, ctx);
    res.json({ success: true, message: 'تم إلغاء التأشيرة بنجاح', data: visa });
  })
);

/**
 * POST /api/muqeem-full/visa/extend
 * تمديد تأشيرة خروج وعودة
 * Body: { visaNumber, additionalDays }
 */
router.post(
  '/visa/extend',
  authenticateToken,
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const { visaNumber, additionalDays } = req.body;
    if (!visaNumber) return res.status(400).json({ success: false, message: 'visaNumber مطلوب' });
    if (!additionalDays)
      return res.status(400).json({ success: false, message: 'additionalDays مطلوب' });

    const ctx = buildContext(req);
    const visa = await muqeemService.extendVisa(visaNumber, parseInt(additionalDays, 10), ctx);
    res.json({ success: true, message: 'تم تمديد التأشيرة بنجاح', data: visa });
  })
);

// =============================================================================
// نقل الخدمات (الكفالة)
// =============================================================================

/**
 * POST /api/muqeem-full/transfer/request
 * طلب نقل خدمات (استقدام)
 * Body: { employeeId, fromEstablishment }
 */
router.post(
  '/transfer/request',
  authenticateToken,
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const { employeeId, fromEstablishment } = req.body;
    if (!employeeId) return res.status(400).json({ success: false, message: 'employeeId مطلوب' });
    if (!fromEstablishment)
      return res.status(400).json({ success: false, message: 'fromEstablishment مطلوب' });

    const ctx = buildContext(req);
    const transfer = await muqeemService.requestTransfer(employeeId, fromEstablishment, ctx);
    res.status(201).json({
      success: true,
      message: 'تم إرسال طلب نقل الخدمات بنجاح',
      data: transfer,
    });
  })
);

/**
 * PUT /api/muqeem-full/transfer/:transferId/approve
 * قبول طلب نقل خدمات (تنازل)
 */
router.put(
  '/transfer/:transferId/approve',
  authenticateToken,
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const ctx = buildContext(req);
    const transfer = await muqeemService.approveTransfer(req.params.transferId, ctx);
    res.json({
      success: true,
      message: 'تم قبول طلب نقل الخدمات بنجاح',
      data: transfer,
    });
  })
);

/**
 * PUT /api/muqeem-full/transfer/:transferId/reject
 * رفض طلب نقل خدمات
 * Body: { reason }
 */
router.put(
  '/transfer/:transferId/reject',
  authenticateToken,
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const { reason } = req.body;
    if (!reason)
      return res.status(400).json({ success: false, message: 'reason (سبب الرفض) مطلوب' });

    const ctx = buildContext(req);
    const transfer = await muqeemService.rejectTransfer(req.params.transferId, reason, ctx);
    res.json({ success: true, message: 'تم رفض طلب نقل الخدمات', data: transfer });
  })
);

/**
 * GET /api/muqeem-full/transfer/pending
 * طلبات النقل المعلقة من مقيم
 */
router.get(
  '/transfer/pending',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const ctx = buildContext(req);
    const data = await muqeemService.getPendingTransfers(ctx);
    res.json({ success: true, data });
  })
);

/**
 * GET /api/muqeem-full/transfer/:muqeemRequestId/status
 * حالة طلب نقل من مقيم
 */
router.get(
  '/transfer/:muqeemRequestId/status',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const ctx = buildContext(req);
    const data = await muqeemService.getTransferStatus(req.params.muqeemRequestId, ctx);
    res.json({ success: true, data });
  })
);

// =============================================================================
// التقارير والتنبيهات
// =============================================================================

/**
 * GET /api/muqeem-full/reports/visa-status
 * تقرير حالة التأشيرات
 */
router.get(
  '/reports/visa-status',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const ctx = buildContext(req);
    const data = await muqeemService.getVisaStatusReport(ctx);
    res.json({ success: true, data });
  })
);

/**
 * POST /api/muqeem-full/alerts/check
 * تشغيل فحص التنبيهات يدوياً (admin only)
 */
router.post(
  '/alerts/check',
  authenticateToken,
  authorize(['admin']),
  asyncHandler(async (req, res) => {
    const stats = await muqeemService.checkAndSendExpiryAlerts();
    res.json({
      success: true,
      message: 'تم فحص التنبيهات بنجاح',
      data: stats,
    });
  })
);

/**
 * GET /api/muqeem-full/employee/:employeeId/transactions
 * تاريخ معاملات موظف مع مقيم
 */
router.get(
  '/employee/:employeeId/transactions',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const data = await muqeemService.getEmployeeTransactions(req.params.employeeId);
    res.json({ success: true, data });
  })
);

/**
 * GET /api/muqeem-full/reports/expiring
 * تقرير الإقامات المنتهية من مقيم مباشرة
 * Query: withinDays (default: 90)
 */
router.get(
  '/reports/expiring',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const withinDays = parseInt(req.query.withinDays || '90', 10);
    const ctx = buildContext(req);
    const data = await muqeemService.getExpiringFromMuqeem(withinDays, ctx);
    res.json({ success: true, data });
  })
);

module.exports = router;
