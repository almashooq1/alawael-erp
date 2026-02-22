/**
 * 📊 مسارات التقارير المتقدمة والتحليلات
 */

const express = require('express');
const router = express.Router();
const reportingService = require('../services/advancedReportingService');
const { authenticateToken } = require('../middleware/auth');

// توليد تقرير جديد
router.post('/generate', authenticateToken, (req, res) => {
  try {
    const report = reportingService.generateReport(req.body);
    res.json({
      success: true,
      message: 'تم توليد التقرير',
      report,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// جلب التقارير
router.get('/', (req, res) => {
  try {
    const result = reportingService.getReports(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// جلب تفاصيل التقرير
router.get('/:id', (req, res) => {
  try {
    const report = reportingService.getReportDetails(parseInt(req.params.id));
    if (!report) {
      return res.status(404).json({ success: false, message: 'التقرير غير موجود' });
    }
    res.json(report);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// تصدير التقرير
router.get('/:id/export/:format', (req, res) => {
  try {
    const export_data = reportingService.exportReport(parseInt(req.params.id), req.params.format);
    if (!export_data) {
      return res.status(404).json({ success: false, message: 'التقرير غير موجود' });
    }
    res.json(export_data);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ملخص تنفيذي
router.get('/:id/executive-summary', (req, res) => {
  try {
    const summary = reportingService.generateExecutiveSummary(parseInt(req.params.id));
    if (!summary) {
      return res.status(404).json({ success: false, message: 'التقرير غير موجود' });
    }
    res.json(summary);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PDF
router.get('/:id/pdf', (req, res) => {
  try {
    const pdf = reportingService.generatePDFReport(parseInt(req.params.id));
    if (!pdf) {
      return res.status(404).json({ success: false, message: 'التقرير غير موجود' });
    }
    res.json(pdf);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// جدولة التقارير
router.post('/schedule', authenticateToken, (req, res) => {
  try {
    const schedule = reportingService.scheduleReport(req.body);
    res.json({
      success: true,
      message: 'تم جدولة التقرير',
      schedule,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// التقارير المجدولة
router.get('/scheduled', (req, res) => {
  try {
    const schedules = reportingService.getScheduledReports();
    res.json({ schedules });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// مقارنة الفترات
router.post('/compare-periods', (req, res) => {
  try {
    const comparison = reportingService.comparePeriodsReport(
      req.body.vehicleId,
      req.body.period1,
      req.body.period2
    );
    res.json(comparison);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// مقارنة المركبات
router.post('/compare-vehicles', (req, res) => {
  try {
    const comparison = reportingService.compareVehiclesReport(req.body.vehicleIds, req.body.metric);
    res.json(comparison);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// تقرير الأداء المخصص
router.post('/custom-performance', (req, res) => {
  try {
    const report = reportingService.getCustomPerformanceReport(req.body);
    res.json(report);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// تقرير الامتثال والسلامة
router.get('/compliance/:vehicleId', (req, res) => {
  try {
    const report = reportingService.getComplianceSafetyReport(
      req.params.vehicleId,
      req.query.period
    );
    res.json(report);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// تقرير الكفاءة العملياتية
router.get('/operational-efficiency/:vehicleId', (req, res) => {
  try {
    const report = reportingService.getOperationalEfficiencyReport(
      req.params.vehicleId,
      req.query.startDate,
      req.query.endDate
    );
    res.json(report);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// تقرير الموارد البشرية
router.get('/hr-resources', (req, res) => {
  try {
    const report = reportingService.getHRResourceReport(req.query.period);
    res.json(report);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// تقرير تقييم المخاطر
router.get('/risk-assessment', (req, res) => {
  try {
    const report = reportingService.getRiskAssessmentReport();
    res.json(report);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// تقرير الاستدامة
router.get('/sustainability', (req, res) => {
  try {
    const report = reportingService.getSustainabilityReport(req.query.startDate, req.query.endDate);
    res.json(report);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
