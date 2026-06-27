/**
 * bi-analytics.routes.js — مسارات التحليلات المتقدمة وذكاء الأعمال
 * ═══════════════════════════════════════════════════════════════════
 * نقاط نهاية BI Analytics:
 *   GET  /api/v1/bi/config          — إعدادات منشئ التقارير
 *   POST /api/v1/bi/reports          — بناء تقرير مخصص
 *   GET  /api/v1/bi/reports/:id      — جلب بيانات التقرير
 *   POST /api/v1/bi/reports/:id/export — تصدير (excel | pdf | powerbi)
 *   POST /api/v1/bi/schedule         — جدولة تقرير
 *   GET  /api/v1/bi/scheduled        — قائمة التقارير المجدولة
 *   GET  /api/v1/bi/warehouse        — ملخص مستودع البيانات
 *   POST /api/v1/bi/predictive      — تحليلات تنبؤية
 */

'use strict';

const express = require('express');
const router = express.Router();
const biAnalyticsService = require('../services/biAnalytics.service');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');

const BI_ANALYTICS_ROLES = [
  'admin', 'super_admin', 'superadmin', 'manager',
  'branch_manager', 'analyst', 'finance', 'finance_manager', 'hr_manager',
];

router.use(authenticate);
router.use(requireBranchAccess);
router.use(authorize(BI_ANALYTICS_ROLES));

// ═══════════════════════════════════════════════════════════════════
// 1. GET /api/v1/bi/config — إعدادات منشئ التقارير
// ═══════════════════════════════════════════════════════════════════
router.get('/config', async (req, res) => {
  try {
    const config = biAnalyticsService.getReportBuilderConfig();
    res.json({ success: true, data: config });
  } catch (err) {
    logger.error('[BI-Analytics] config error:', err);
    safeError(res, 500, 'فشل في جلب إعدادات منشئ التقارير', err.message);
  }
});

// ═══════════════════════════════════════════════════════════════════
// 2. POST /api/v1/bi/reports — بناء تقرير مخصص
// ═══════════════════════════════════════════════════════════════════
router.post('/reports', async (req, res) => {
  try {
    const config = req.body;
    if (!config?.sourceId) {
      return safeError(res, 400, 'مصدر البيانات مطلوب (sourceId)');
    }
    const report = await biAnalyticsService.buildCustomReport(config);
    res.json({ success: true, data: report });
  } catch (err) {
    logger.error('[BI-Analytics] build report error:', err);
    safeError(res, 500, 'فشل في بناء التقرير', err.message);
  }
});

// ═══════════════════════════════════════════════════════════════════
// 3. GET /api/v1/bi/reports/:templateId — جلب بيانات التقرير
// ═══════════════════════════════════════════════════════════════════
router.get('/reports/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const { startDate, endDate, ...filters } = req.query;
    const report = await biAnalyticsService.getReportData(
      templateId,
      filters,
      startDate,
      endDate
    );
    res.json({ success: true, data: report });
  } catch (err) {
    logger.error('[BI-Analytics] get report error:', err);
    safeError(res, 500, 'فشل في جلب بيانات التقرير', err.message);
  }
});

// ═══════════════════════════════════════════════════════════════════
// 4. POST /api/v1/bi/reports/:templateId/export — تصدير التقرير
// ═══════════════════════════════════════════════════════════════════
router.post('/reports/:templateId/export', async (req, res) => {
  try {
    const { templateId } = req.params;
    const { format = 'excel', startDate, endDate, ...filters } = req.body;

    const report = await biAnalyticsService.getReportData(
      templateId,
      filters,
      startDate,
      endDate
    );

    let result;
    switch (format.toLowerCase()) {
      case 'excel':
      case 'xlsx':
        result = await biAnalyticsService.exportToExcel(report);
        break;
      case 'pdf':
        result = await biAnalyticsService.exportToPDF(report);
        break;
      case 'powerbi':
      case 'json':
        result = await biAnalyticsService.exportToPowerBI(report);
        break;
      default:
        return safeError(res, 400, 'صيغة التصدير غير مدعومة');
    }

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  } catch (err) {
    logger.error('[BI-Analytics] export error:', err);
    safeError(res, 500, 'فشل في تصدير التقرير', err.message);
  }
});

// ═══════════════════════════════════════════════════════════════════
// 5. POST /api/v1/bi/schedule — جدولة تقرير
// ═══════════════════════════════════════════════════════════════════
router.post('/schedule', async (req, res) => {
  try {
    const { templateId, schedule } = req.body;
    if (!templateId || !schedule) {
      return safeError(res, 400, 'معرف القالب وإعدادات الجدولة مطلوبة');
    }
    const result = await biAnalyticsService.scheduleReport(templateId, schedule);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error('[BI-Analytics] schedule error:', err);
    safeError(res, 500, 'فشل في جدولة التقرير', err.message);
  }
});

// ═══════════════════════════════════════════════════════════════════
// 6. GET /api/v1/bi/scheduled — قائمة التقارير المجدولة
// ═══════════════════════════════════════════════════════════════════
router.get('/scheduled', async (req, res) => {
  try {
    const reports = await biAnalyticsService.getScheduledReports();
    res.json({ success: true, data: reports, count: reports.length });
  } catch (err) {
    logger.error('[BI-Analytics] scheduled reports error:', err);
    safeError(res, 500, 'فشل في جلب التقارير المجدولة', err.message);
  }
});

// ═══════════════════════════════════════════════════════════════════
// 7. GET /api/v1/bi/warehouse — ملخص مستودع البيانات
// ═══════════════════════════════════════════════════════════════════
router.get('/warehouse', async (req, res) => {
  try {
    const summary = await biAnalyticsService.getDataWarehouseSummary();
    res.json({ success: true, data: summary });
  } catch (err) {
    logger.error('[BI-Analytics] warehouse error:', err);
    safeError(res, 500, 'فشل في جلب ملخص مستودع البيانات', err.message);
  }
});

// ═══════════════════════════════════════════════════════════════════
// 8. POST /api/v1/bi/predictive — تحليلات تنبؤية
// ═══════════════════════════════════════════════════════════════════
router.post('/predictive', async (req, res) => {
  try {
    const { type = 'revenue', params = {} } = req.body;
    const result = await biAnalyticsService.getPredictiveAnalytics(type, params);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error('[BI-Analytics] predictive error:', err);
    safeError(res, 500, 'فشل في التحليل التنبؤي', err.message);
  }
});

// ═══════════════════════════════════════════════════════════════════
// 9. POST /api/v1/bi/reports/custom/export — تصدير تقرير مبني (بدون template)
// ═══════════════════════════════════════════════════════════════════
router.post('/reports/custom/export', async (req, res) => {
  try {
    const { config, format = 'excel' } = req.body;
    if (!config?.sourceId) {
      return safeError(res, 400, 'تكوين التقرير مطلوب');
    }

    const report = await biAnalyticsService.buildCustomReport(config);

    let result;
    switch (format.toLowerCase()) {
      case 'excel':
      case 'xlsx':
        result = await biAnalyticsService.exportToExcel(report);
        break;
      case 'pdf':
        result = await biAnalyticsService.exportToPDF(report);
        break;
      case 'powerbi':
      case 'json':
        result = await biAnalyticsService.exportToPowerBI(report);
        break;
      default:
        return safeError(res, 400, 'صيغة التصدير غير مدعومة');
    }

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  } catch (err) {
    logger.error('[BI-Analytics] custom export error:', err);
    safeError(res, 500, 'فشل في تصدير التقرير', err.message);
  }
});

module.exports = router;
