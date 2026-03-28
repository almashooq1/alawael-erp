/**
 * Therapy Sessions Analytics Routes — مسارات تحليلات الجلسات العلاجية
 *
 * Advanced analytics, calendar view, export, waitlist, and billing routes
 * for the enhanced therapy sessions dashboard.
 *
 * Endpoints:
 * ─── GET  /analytics/overview           — نظرة عامة شاملة
 * ─── GET  /analytics/trends             — اتجاهات الجلسات
 * ─── GET  /analytics/therapist-performance — مقارنة أداء المعالجين
 * ─── GET  /analytics/room-utilization   — استخدام الغرف
 * ─── GET  /analytics/attendance         — تقارير الحضور
 * ─── GET  /analytics/billing            — ملخص الفوترة
 * ─── GET  /analytics/goal-progress      — تقدم الأهداف
 * ─── GET  /analytics/cancellations      — تحليل الإلغاءات
 * ─── GET  /calendar                     — عرض التقويم
 * ─── POST /export/report                — تصدير تقرير
 * ─── GET  /waitlist                     — قائمة الانتظار
 * ─── PATCH /:id/billing                 — تحديث الفوترة
 * ─── POST /billing/bulk                 — تحديث فوترة جماعي
 *
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const analyticsService = require('../services/therapySessionAnalytics.service');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const { safeError } = require('../utils/safeError');

// ─── Authentication required for all routes ───────────────────────────
router.use(authenticate);

// ═══════════════════════════════════════════════════════════════════════════
//  Analytics Endpoints — نقاط تحليلية
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/therapy-sessions-analytics/analytics/overview
 * نظرة عامة على لوحة المعلومات مع مؤشرات الأداء الرئيسية
 */
router.get('/analytics/overview', async (req, res) => {
  try {
    const data = await analyticsService.getDashboardOverview(req.query);
    return res.json({ success: true, data });
  } catch (error) {
    logger.error('GET /analytics/overview error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'خطأ في تحميل نظرة عامة على التحليلات',
      error: safeError(error),
    });
  }
});

/**
 * GET /api/therapy-sessions-analytics/analytics/trends
 * اتجاهات الجلسات (يومي/أسبوعي/شهري)
 */
router.get('/analytics/trends', async (req, res) => {
  try {
    const data = await analyticsService.getSessionTrends(req.query);
    return res.json({ success: true, data });
  } catch (error) {
    logger.error('GET /analytics/trends error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'خطأ في تحميل اتجاهات الجلسات',
      error: safeError(error),
    });
  }
});

/**
 * GET /api/therapy-sessions-analytics/analytics/therapist-performance
 * مقارنة أداء المعالجين
 */
router.get('/analytics/therapist-performance', async (req, res) => {
  try {
    const query = { ...req.query };
    // Parse therapistIds if provided as comma-separated
    if (query.therapistIds && typeof query.therapistIds === 'string') {
      query.therapistIds = query.therapistIds.split(',').filter(Boolean);
    }
    const data = await analyticsService.getTherapistPerformance(query);
    return res.json({ success: true, data });
  } catch (error) {
    logger.error('GET /analytics/therapist-performance error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'خطأ في تحميل أداء المعالجين',
      error: safeError(error),
    });
  }
});

/**
 * GET /api/therapy-sessions-analytics/analytics/room-utilization
 * استخدام الغرف
 */
router.get('/analytics/room-utilization', async (req, res) => {
  try {
    const data = await analyticsService.getRoomUtilization(req.query);
    return res.json({ success: true, data });
  } catch (error) {
    logger.error('GET /analytics/room-utilization error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'خطأ في تحميل استخدام الغرف',
      error: safeError(error),
    });
  }
});

/**
 * GET /api/therapy-sessions-analytics/analytics/attendance
 * تقارير الحضور والغياب
 */
router.get('/analytics/attendance', async (req, res) => {
  try {
    const data = await analyticsService.getAttendanceReport(req.query);
    return res.json({ success: true, data });
  } catch (error) {
    logger.error('GET /analytics/attendance error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'خطأ في تحميل تقارير الحضور',
      error: safeError(error),
    });
  }
});

/**
 * GET /api/therapy-sessions-analytics/analytics/billing
 * ملخص الفوترة والإيرادات
 */
router.get('/analytics/billing', async (req, res) => {
  try {
    const data = await analyticsService.getBillingSummary(req.query);
    return res.json({ success: true, data });
  } catch (error) {
    logger.error('GET /analytics/billing error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'خطأ في تحميل ملخص الفوترة',
      error: safeError(error),
    });
  }
});

/**
 * GET /api/therapy-sessions-analytics/analytics/goal-progress
 * تقدم الأهداف العلاجية
 */
router.get('/analytics/goal-progress', async (req, res) => {
  try {
    const data = await analyticsService.getGoalProgressAnalytics(req.query);
    return res.json({ success: true, data });
  } catch (error) {
    logger.error('GET /analytics/goal-progress error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'خطأ في تحميل تقدم الأهداف',
      error: safeError(error),
    });
  }
});

/**
 * GET /api/therapy-sessions-analytics/analytics/cancellations
 * تحليل الإلغاءات
 */
router.get('/analytics/cancellations', async (req, res) => {
  try {
    const data = await analyticsService.getCancellationAnalysis(req.query);
    return res.json({ success: true, data });
  } catch (error) {
    logger.error('GET /analytics/cancellations error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'خطأ في تحميل تحليل الإلغاءات',
      error: safeError(error),
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  Calendar View — عرض التقويم
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/therapy-sessions-analytics/calendar
 * جلسات بتنسيق التقويم
 */
router.get('/calendar', async (req, res) => {
  try {
    const data = await analyticsService.getCalendarSessions(req.query);
    return res.json({ success: true, data });
  } catch (error) {
    logger.error('GET /calendar error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'خطأ في تحميل بيانات التقويم',
      error: safeError(error),
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  Export — تصدير تقارير
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/therapy-sessions-analytics/export/report
 * تصدير تقرير الجلسات
 */
router.post('/export/report', async (req, res) => {
  try {
    const query = { ...req.body, ...req.query };
    const data = await analyticsService.generateExportReport(query);

    if (data.format === 'csv') {
      // Return as CSV
      const csvContent = [
        data.headers.join(','),
        ...data.rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      // Add BOM for Arabic support in Excel
      const bom = '\uFEFF';
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="therapy-sessions-report-${new Date().toISOString().split('T')[0]}.csv"`
      );
      return res.send(bom + csvContent);
    }

    return res.json({ success: true, data });
  } catch (error) {
    logger.error('POST /export/report error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'خطأ في تصدير التقرير',
      error: safeError(error),
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  Waitlist — قائمة الانتظار
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/therapy-sessions-analytics/waitlist
 * الحصول على قائمة الانتظار (الفترات المتاحة)
 */
router.get('/waitlist', async (req, res) => {
  try {
    const data = await analyticsService.getWaitlist(req.query);
    return res.json({ success: true, data });
  } catch (error) {
    logger.error('GET /waitlist error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'خطأ في تحميل قائمة الانتظار',
      error: safeError(error),
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  Billing — الفوترة
// ═══════════════════════════════════════════════════════════════════════════

/**
 * PATCH /api/therapy-sessions-analytics/:sessionId/billing
 * تحديث حالة فوترة جلسة
 */
router.patch(
  '/:sessionId/billing',
  authorize(['admin', 'manager', 'accountant']),
  async (req, res) => {
    try {
      const session = await analyticsService.updateBillingStatus(req.params.sessionId, req.body);
      return res.json({
        success: true,
        message: 'تم تحديث حالة الفوترة',
        data: session,
      });
    } catch (error) {
      logger.error('PATCH /:id/billing error:', error.message);
      const status = error.statusCode || 500;
      return res.status(status).json({
        success: false,
        message: safeError(error) || 'خطأ في تحديث الفوترة',
        error: safeError(error),
      });
    }
  }
);

/**
 * POST /api/therapy-sessions-analytics/billing/bulk
 * تحديث فوترة جماعي
 */
router.post('/billing/bulk', authorize(['admin', 'manager', 'accountant']), async (req, res) => {
  try {
    const { sessionIds, isBilled, invoiceId } = req.body;
    if (!sessionIds || !Array.isArray(sessionIds) || sessionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد الجلسات المراد تحديثها',
      });
    }

    const result = await analyticsService.bulkUpdateBilling(
      sessionIds,
      isBilled !== false,
      invoiceId
    );
    return res.json({
      success: true,
      message: `تم تحديث ${result.modified} جلسة`,
      data: result,
    });
  } catch (error) {
    logger.error('POST /billing/bulk error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'خطأ في التحديث الجماعي',
      error: safeError(error),
    });
  }
});

module.exports = router;
