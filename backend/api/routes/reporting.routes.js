/**
 * Reporting Routes
 * مسارات التقارير المتقدمة
 */

const express = require('express');
const router = express.Router();
const AdvancedReportingService = require('../../services/advancedReportingService');

const reportingService = new AdvancedReportingService();

/**
 * POST /api/reports
 * توليد تقرير جديد
 */
router.post('/reports', (req, res, next) => {
  try {
    const { template, data, options } = req.body;

    if (!template || !data) {
      return res.status(400).json({ success: false, error: 'القالب والبيانات مطلوبة' });
    }

    const report = reportingService.generateReport(template, data, options);

    res.status(201).json({
      success: true,
      reportId: report.id,
      report,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/reports/schedule
 * جدولة تقرير دوري
 */
router.post('/reports/schedule', (req, res, next) => {
  try {
    const { templateId, frequency, recipients } = req.body;

    if (!templateId || !frequency) {
      return res.status(400).json({ success: false, error: 'القالب والتكرار مطلوبان' });
    }

    const schedule = reportingService.scheduleReport(templateId, frequency, recipients);

    res.status(201).json({
      success: true,
      schedule,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reports/:id
 * الحصول على تقرير
 */
router.get('/reports/:id', (req, res, next) => {
  try {
    const report = reportingService.reports.get(req.params.id);

    if (!report) {
      return res.status(404).json({ success: false, error: 'التقرير غير موجود' });
    }

    res.json({ success: true, report });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reports/:id/export
 * تصدير التقرير
 */
router.get('/reports/:id/export', (req, res, next) => {
  try {
    const { format } = req.query;
    const exported = reportingService.exportReport(req.params.id, format || 'pdf');

    if (!exported) {
      return res.status(404).json({ success: false, error: 'التقرير غير موجود' });
    }

    if (format === 'csv' || format === 'html') {
      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'text/html');
      res.send(exported);
    } else {
      res.json({ success: true, format, exported });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/reports/:id
 * حذف تقرير
 */
router.delete('/reports/:id', (req, res, next) => {
  try {
    const deleted = reportingService.reports.delete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'التقرير غير موجود' });
    }

    res.json({ success: true, message: 'تم حذف التقرير بنجاح' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
