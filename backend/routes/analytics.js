// Advanced Analytics Routes
// نقاط التحليلات المتقدمة

const express = require('express');
const router = express.Router();
const AnalyticsService = require('../services/analyticsService');
const { ApiResponse, ApiError } = require('../utils/apiResponse');

// تتبع سلوك المستخدم
router.get('/user-behavior/:userId', (req, res, next) => {
  try {
    const { userId } = req.params;

    const result = AnalyticsService.trackUserBehavior(userId);

    return res.status(200).json(new ApiResponse(200, result, 'User behavior tracked'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to track user behavior', [error.message]));
  }
});

// الحصول على مقاييس الأداء
router.get('/performance-metrics', (req, res, next) => {
  try {
    const { timeRange } = req.query;

    const result = AnalyticsService.getPerformanceMetrics(timeRange || '24h');

    return res.status(200).json(new ApiResponse(200, result, 'Performance metrics fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch performance metrics', [error.message]));
  }
});

// عرض لوحة تحكم مخصصة
router.get('/dashboard/:userId', (req, res, next) => {
  try {
    const { userId } = req.params;

    const result = AnalyticsService.getCustomDashboard(userId);

    return res.status(200).json(new ApiResponse(200, result, 'Dashboard fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch dashboard', [error.message]));
  }
});

// تحليل الاتجاهات
router.get('/trends/:metric', (req, res, next) => {
  try {
    const { metric } = req.params;
    const { period } = req.query;

    const result = AnalyticsService.analyzeTrends(metric, period || '30d');

    return res.status(200).json(new ApiResponse(200, result, 'Trends analyzed'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to analyze trends', [error.message]));
  }
});

// الحصول على التوصيات
router.get('/recommendations', (req, res, next) => {
  try {
    const result = AnalyticsService.getRecommendations();

    return res.status(200).json(new ApiResponse(200, result, 'Recommendations fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch recommendations', [error.message]));
  }
});

// مقارنة المقاييس
router.post('/compare-metrics', (req, res) => {
  try {
    const { metric1, metric2, period } = req.body;

    if (!metric1 || !metric2) {
      return res.status(400).json({
        success: false,
        message: 'Metrics required',
      });
    }

    const result = AnalyticsService.compareMetrics(metric1, metric2, period || '30d');

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to compare metrics',
      error: error.message,
    });
  }
});

// توليد تقرير تحليلي
router.post('/generate-report', (req, res) => {
  try {
    const { reportType } = req.body;

    const result = AnalyticsService.generateAnalysisReport(reportType || 'executive');

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      error: error.message,
    });
  }
});

// تتبع التحويل
router.post('/track-conversion', (req, res) => {
  try {
    const { userId, event } = req.body;

    if (!userId || !event) {
      return res.status(400).json({
        success: false,
        message: 'User ID and event required',
      });
    }

    const result = AnalyticsService.trackConversion(userId, event);

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to track conversion',
      error: error.message,
    });
  }
});

// التحليلات في الوقت الفعلي
router.get('/real-time', (req, res) => {
  try {
    const result = AnalyticsService.getRealTimeAnalytics();

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch real-time analytics',
      error: error.message,
    });
  }
});

// التنبؤات التحليلية
router.get('/predictions', (req, res) => {
  try {
    const result = AnalyticsService.getPredictiveAnalytics();

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch predictions',
      error: error.message,
    });
  }
});

// تصدير التقرير
router.get('/export/:format', (req, res) => {
  try {
    const { format } = req.params;

    if (!['pdf', 'xlsx', 'csv'].includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Supported: pdf, xlsx, csv',
      });
    }

    const result = AnalyticsService.exportAnalyticsReport(format);

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to export report',
      error: error.message,
    });
  }
});

// اختبار A/B
router.get('/ab-test/:testId', (req, res) => {
  try {
    const { testId } = req.params;

    const result = AnalyticsService.getABTestResults(testId);

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch A/B test results',
      error: error.message,
    });
  }
});

// مقاييس التسويق
router.get('/marketing/:campaign', (req, res) => {
  try {
    const { campaign } = req.params;

    const result = AnalyticsService.getMarketingMetrics(campaign);

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch marketing metrics',
      error: error.message,
    });
  }
});

/**
 * ======================
 * NEW ADVANCED ANALYTICS ENDPOINTS
 * مسارات التحليلات المتقدمة الجديدة
 * ======================
 */

const { authenticate, authorize } = require('../middleware/auth');
const {
  KPI,
  ReportTemplate,
  GeneratedReport,
  Dashboard,
  Prediction,
} = require('../models/analytics');

/**
 * KPI ENDPOINTS
 */

// Get all KPIs
router.get('/kpis', authenticate, async (req, res) => {
  try {
    const { category, isActive } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const kpis = await KPI.find(filter).sort({ category: 1, code: 1 });
    res.json({ success: true, count: kpis.length, data: kpis });
  } catch (error) {
    res.status(500).json({ success: false, error: 'خطأ في جلب المؤشرات' });
  }
});

// Get single KPI
router.get('/kpis/:id', authenticate, async (req, res) => {
  try {
    const kpi = await KPI.findById(req.params.id);
    if (!kpi) return res.status(404).json({ success: false, error: 'المؤشر غير موجود' });
    res.json({ success: true, data: kpi });
  } catch (error) {
    res.status(500).json({ success: false, error: 'خطأ في جلب المؤشر' });
  }
});

// Create KPI
router.post('/kpis', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const kpi = new KPI({ ...req.body, createdBy: req.user._id });
    await kpi.save();
    res.status(201).json({ success: true, data: kpi, message: 'تم إنشاء المؤشر بنجاح' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: 'رمز المؤشر موجود مسبقاً' });
    }
    res.status(500).json({ success: false, error: 'خطأ في إنشاء المؤشر' });
  }
});

// Calculate KPI
router.post('/kpis/:id/calculate', authenticate, async (req, res) => {
  try {
    const kpi = await AnalyticsService.calculateKPI(req.params.id);
    res.json({ success: true, data: kpi, message: 'تم حساب المؤشر بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || 'خطأ في حساب المؤشر' });
  }
});

/**
 * DASHBOARD ENDPOINTS
 */

// Executive Dashboard
router.get(
  '/dashboard/executive',
  authenticate,
  authorize('admin', 'manager'),
  async (req, res) => {
    try {
      const dashboard = await AnalyticsService.getExecutiveDashboard(req.query);
      res.json({ success: true, data: dashboard });
    } catch (error) {
      res.status(500).json({ success: false, error: 'خطأ في جلب لوحة التحكم' });
    }
  }
);

// Get dashboards
router.get('/dashboards', authenticate, async (req, res) => {
  try {
    const filter = {
      $or: [
        { 'permissions.owner': req.user._id },
        { 'permissions.sharedWith.user': req.user._id },
        { 'permissions.isPublic': true },
      ],
    };
    const dashboards = await Dashboard.find(filter)
      .populate('permissions.owner', 'name email')
      .sort({ isDefault: -1, createdAt: -1 });
    res.json({ success: true, count: dashboards.length, data: dashboards });
  } catch (error) {
    res.status(500).json({ success: false, error: 'خطأ في جلب لوحات التحكم' });
  }
});

/**
 * REPORT ENDPOINTS
 */

// Get report templates
router.get('/report-templates', authenticate, async (req, res) => {
  try {
    const { category } = req.query;
    const filter = {
      $or: [{ 'permissions.canView': req.user.role }, { 'permissions.isPublic': true }],
    };
    if (category) filter.category = category;

    const templates = await ReportTemplate.find(filter)
      .populate('structure.kpis')
      .sort({ category: 1, name: 1 });
    res.json({ success: true, count: templates.length, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, error: 'خطأ في جلب قوالب التقارير' });
  }
});

// Generate report
router.post('/reports/generate', authenticate, async (req, res) => {
  try {
    const { templateId, filters, format = 'pdf' } = req.body;
    if (!templateId) {
      return res.status(400).json({ success: false, error: 'معرف القالب مطلوب' });
    }

    const report = await AnalyticsService.generateReport(templateId, filters, format, req.user._id);
    res.json({ success: true, data: report, message: 'تم توليد التقرير بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || 'خطأ في توليد التقرير' });
  }
});

// Get user reports
router.get('/reports', authenticate, async (req, res) => {
  try {
    const reports = await GeneratedReport.find({ generatedBy: req.user._id })
      .populate('template', 'name nameAr category')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, count: reports.length, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, error: 'خطأ في جلب التقارير' });
  }
});

// Download report
router.get('/reports/:id/download', authenticate, async (req, res) => {
  try {
    const report = await GeneratedReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, error: 'التقرير غير موجود' });
    }

    if (report.generatedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'ليس لديك صلاحية لتحميل هذا التقرير' });
    }

    if (report.status !== 'completed') {
      return res.status(400).json({ success: false, error: 'التقرير لم يكتمل بعد' });
    }

    report.downloads += 1;
    await report.save();

    res.download(report.file.path);
  } catch (error) {
    res.status(500).json({ success: false, error: 'خطأ في تحميل التقرير' });
  }
});

/**
 * PREDICTIVE ANALYTICS
 */

// Create prediction
router.post('/predictions', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { type, kpiId, period } = req.body;
    if (!type || !kpiId) {
      return res.status(400).json({ success: false, error: 'النوع ومعرف المؤشر مطلوبان' });
    }

    const prediction = await AnalyticsService.generatePrediction(type, kpiId, period || 30);
    res.status(201).json({ success: true, data: prediction, message: 'تم إنشاء التنبؤ بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || 'خطأ في إنشاء التنبؤ' });
  }
});

// Get predictions
router.get('/predictions', authenticate, async (req, res) => {
  try {
    const predictions = await Prediction.find()
      .populate('kpi', 'name nameAr code')
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ success: true, count: predictions.length, data: predictions });
  } catch (error) {
    res.status(500).json({ success: false, error: 'خطأ في جلب التنبؤات' });
  }
});

/**
 * SUMMARY
 */

// Analytics summary
router.get('/summary', authenticate, async (req, res) => {
  try {
    const summary = {
      kpis: {
        total: await KPI.countDocuments({ isActive: true }),
        byCategory: await KPI.aggregate([
          { $match: { isActive: true } },
          { $group: { _id: '$category', count: { $sum: 1 } } },
        ]),
      },
      reports: {
        total: await GeneratedReport.countDocuments(),
        completed: await GeneratedReport.countDocuments({ status: 'completed' }),
      },
      dashboards: {
        total: await Dashboard.countDocuments({ isActive: true }),
      },
    };
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, error: 'خطأ في جلب ملخص التحليلات' });
  }
});

module.exports = router;
