/**
 * PDPL Routes — مسارات نظام حماية البيانات الشخصية السعودي
 *
 * البرومبت 19: الأمان والخادم والنشر
 *
 * المسارات:
 *   سجل المعالجة:
 *     POST /api/pdpl/processing-records     — تسجيل نشاط معالجة
 *     GET  /api/pdpl/processing-records     — قائمة سجلات المعالجة
 *
 *   الموافقة (Consent):
 *     POST /api/pdpl/consents               — تسجيل موافقة
 *     DELETE /api/pdpl/consents             — سحب الموافقة
 *     GET  /api/pdpl/consents/:userId       — موافقات المستخدم
 *     GET  /api/pdpl/consents/check         — التحقق من وجود موافقة
 *
 *   طلبات أصحاب البيانات:
 *     POST /api/pdpl/subject-requests       — إنشاء طلب
 *     GET  /api/pdpl/subject-requests       — قائمة الطلبات
 *     PUT  /api/pdpl/subject-requests/:id   — تحديث الطلب
 *     GET  /api/pdpl/subject-requests/overdue — الطلبات المتأخرة
 *
 *   تصدير / محو البيانات:
 *     GET  /api/pdpl/export/:userId         — تصدير بيانات المستخدم
 *     DELETE /api/pdpl/erase/:userId        — محو بيانات المستخدم
 *
 *   خرق البيانات:
 *     POST /api/pdpl/breaches               — الإبلاغ عن خرق
 *     GET  /api/pdpl/breaches               — قائمة الحوادث
 *     PUT  /api/pdpl/breaches/:id           — تحديث حادثة خرق
 *
 *   لوحة التحكم:
 *     GET  /api/pdpl/dashboard              — ملخص الامتثال
 *     GET  /api/pdpl/retention-periods      — فترات الاحتفاظ بالبيانات
 *
 * @module routes/pdpl
 */
'use strict';

const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/auth');
const pdplService = require('../services/pdpl.service');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// جميع المسارات تتطلب مصادقة
router.use(authenticateToken);

// ══════════════════════════════════════════════════════
// لوحة التحكم
// ══════════════════════════════════════════════════════

/**
 * GET /api/pdpl/dashboard
 * ملخص الامتثال لـ PDPL
 */
router.get(
  '/dashboard',
  authorize(['admin', 'dpo', 'compliance_officer']),
  asyncHandler(async (req, res) => {
    const result = await pdplService.getComplianceDashboard();
    res.json({ success: true, data: result });
  })
);

/**
 * GET /api/pdpl/retention-periods
 * فترات الاحتفاظ بالبيانات حسب الفئة
 */
router.get(
  '/retention-periods',
  asyncHandler(async (_req, res) => {
    const result = pdplService.getRetentionPeriods();
    res.json({ success: true, data: result });
  })
);

// ══════════════════════════════════════════════════════
// سجل أنشطة المعالجة (مادة 32)
// ══════════════════════════════════════════════════════

/**
 * POST /api/pdpl/processing-records
 * تسجيل نشاط معالجة بيانات جديد
 */
router.post(
  '/processing-records',
  authorize(['admin', 'dpo', 'compliance_officer']),
  asyncHandler(async (req, res) => {
    const result = await pdplService.recordProcessingActivity({
      ...req.body,
      recordedBy: req.user._id || req.user.id,
    });
    res.status(201).json({ success: true, data: result, message: 'تم تسجيل نشاط المعالجة' });
  })
);

/**
 * GET /api/pdpl/processing-records
 * قائمة سجلات أنشطة المعالجة
 */
router.get(
  '/processing-records',
  authorize(['admin', 'dpo', 'compliance_officer']),
  asyncHandler(async (req, res) => {
    const result = await pdplService.getProcessingRecords(req.query);
    res.json({ success: true, data: result });
  })
);

// ══════════════════════════════════════════════════════
// إدارة الموافقة (مادة 6)
// ══════════════════════════════════════════════════════

/**
 * GET /api/pdpl/consents/check?userId=xxx&purpose=xxx
 * التحقق من وجود موافقة نشطة — يجب قبل /:userId
 */
router.get(
  '/consents/check',
  asyncHandler(async (req, res) => {
    const { userId, purpose } = req.query;
    if (!userId || !purpose) {
      return res.status(400).json({ success: false, message: 'userId وpurpose مطلوبان' });
    }
    const hasConsent = await pdplService.checkActiveConsent(userId, purpose);
    res.json({ success: true, data: { hasConsent, userId, purpose } });
  })
);

/**
 * POST /api/pdpl/consents
 * تسجيل موافقة المستخدم على معالجة بياناته
 */
router.post(
  '/consents',
  asyncHandler(async (req, res) => {
    const { userId, purpose, dataTypes, expiresAt } = req.body;
    if (!userId || !purpose || !dataTypes) {
      return res.status(400).json({ success: false, message: 'userId وpurpose وdataTypes مطلوبة' });
    }
    const result = await pdplService.recordConsent(userId, purpose, dataTypes, expiresAt, req);
    res.status(201).json({ success: true, data: result, message: 'تم تسجيل الموافقة' });
  })
);

/**
 * DELETE /api/pdpl/consents
 * سحب موافقة المستخدم
 */
router.delete(
  '/consents',
  asyncHandler(async (req, res) => {
    const { userId, purpose } = req.body;
    if (!userId || !purpose) {
      return res.status(400).json({ success: false, message: 'userId وpurpose مطلوبان' });
    }
    const result = await pdplService.withdrawConsent(userId, purpose);
    res.json({ success: true, data: result, message: 'تم سحب الموافقة' });
  })
);

/**
 * GET /api/pdpl/consents/:userId
 * جلب جميع موافقات مستخدم
 */
router.get(
  '/consents/:userId',
  asyncHandler(async (req, res) => {
    const result = await pdplService.getUserConsents(req.params.userId);
    res.json({ success: true, data: result });
  })
);

// ══════════════════════════════════════════════════════
// طلبات أصحاب البيانات (مادة 4)
// ══════════════════════════════════════════════════════

/**
 * GET /api/pdpl/subject-requests/overdue
 * الطلبات المتأخرة (تجاوزت 30 يوماً) — يجب قبل /:id
 */
router.get(
  '/subject-requests/overdue',
  authorize(['admin', 'dpo', 'compliance_officer']),
  asyncHandler(async (req, res) => {
    const result = await pdplService.getDataSubjectRequests({
      status: 'received',
    });
    const now = new Date();
    const overdue = result.filter(r => r.deadline && new Date(r.deadline) < now);
    res.json({ success: true, data: overdue, count: overdue.length });
  })
);

/**
 * POST /api/pdpl/subject-requests
 * تقديم طلب بيانات (وصول / تصحيح / محو / نقل)
 */
router.post(
  '/subject-requests',
  asyncHandler(async (req, res) => {
    const { userId, requestType, notes } = req.body;
    if (!userId || !requestType) {
      return res.status(400).json({ success: false, message: 'userId وrequestType مطلوبان' });
    }
    const result = await pdplService.handleDataSubjectRequest(userId, requestType, notes);
    res.status(201).json({
      success: true,
      data: result,
      message: 'تم استلام طلبك وسيُرد عليه خلال 30 يوماً',
    });
  })
);

/**
 * GET /api/pdpl/subject-requests
 * قائمة طلبات أصحاب البيانات
 */
router.get(
  '/subject-requests',
  authorize(['admin', 'dpo', 'compliance_officer']),
  asyncHandler(async (req, res) => {
    const result = await pdplService.getDataSubjectRequests(req.query);
    res.json({ success: true, data: result });
  })
);

/**
 * PUT /api/pdpl/subject-requests/:id
 * تحديث حالة طلب بيانات
 */
router.put(
  '/subject-requests/:id',
  authorize(['admin', 'dpo', 'compliance_officer']),
  asyncHandler(async (req, res) => {
    const { status, notes } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'status مطلوب' });
    const result = await pdplService.updateRequestStatus(
      req.params.id,
      status,
      req.user._id || req.user.id,
      notes
    );
    res.json({ success: true, data: result, message: 'تم تحديث الطلب' });
  })
);

// ══════════════════════════════════════════════════════
// تصدير ومحو البيانات
// ══════════════════════════════════════════════════════

/**
 * GET /api/pdpl/export/:userId
 * تصدير جميع بيانات المستخدم (حق الوصول)
 */
router.get(
  '/export/:userId',
  asyncHandler(async (req, res) => {
    // المستخدم يمكنه فقط تصدير بياناته الخاصة (أو المسؤول)
    const requestUserId = String(req.user._id || req.user.id);
    const targetUserId = req.params.userId;
    if (requestUserId !== targetUserId) {
      authorize(['admin', 'dpo'])(req, res, async () => {
        const result = await pdplService.exportUserData(targetUserId);
        res.json({ success: true, data: result });
      });
      return;
    }
    const result = await pdplService.exportUserData(targetUserId);
    res.json({ success: true, data: result });
  })
);

/**
 * DELETE /api/pdpl/erase/:userId
 * محو بيانات المستخدم (حق المحو)
 */
router.delete(
  '/erase/:userId',
  authorize(['admin', 'dpo']),
  asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const result = await pdplService.eraseUserData(req.params.userId, reason);
    res.json({ success: true, data: { erasedItems: result }, message: 'تم محو البيانات الشخصية' });
  })
);

// ══════════════════════════════════════════════════════
// خرق البيانات (مادة 20)
// ══════════════════════════════════════════════════════

/**
 * POST /api/pdpl/breaches
 * الإبلاغ عن حادثة خرق بيانات
 */
router.post(
  '/breaches',
  authorize(['admin', 'dpo', 'security_team']),
  asyncHandler(async (req, res) => {
    const result = await pdplService.reportDataBreach(req.body, req.user._id || req.user.id);
    const status = ['high', 'critical'].includes(result.severity) ? 201 : 201;
    res.status(status).json({
      success: true,
      data: result,
      message: ['high', 'critical'].includes(result.severity)
        ? 'تم تسجيل الحادثة — يجب إخطار SDAIA خلال 72 ساعة'
        : 'تم تسجيل حادثة الخرق',
      requiresSdaiaNotification: ['high', 'critical'].includes(result.severity),
    });
  })
);

/**
 * GET /api/pdpl/breaches
 * قائمة حوادث خرق البيانات
 */
router.get(
  '/breaches',
  authorize(['admin', 'dpo', 'security_team', 'compliance_officer']),
  asyncHandler(async (req, res) => {
    const result = await pdplService.getBreachIncidents(req.query);
    res.json({ success: true, data: result });
  })
);

/**
 * PUT /api/pdpl/breaches/:id
 * تحديث حادثة خرق البيانات
 */
router.put(
  '/breaches/:id',
  authorize(['admin', 'dpo', 'security_team']),
  asyncHandler(async (req, res) => {
    const result = await pdplService.updateBreachIncident(req.params.id, req.body);
    res.json({ success: true, data: result, message: 'تم تحديث سجل الحادثة' });
  })
);

module.exports = router;
