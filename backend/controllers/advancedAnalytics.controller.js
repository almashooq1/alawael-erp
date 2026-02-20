/**
 * متحكم التحليلات والتقارير المتقدم
 * Advanced Analytics Controller
 */

const AdvancedAnalyticsService = require('../services/advancedAnalytics.service');
const Logger = require('../utils/logger');

class AdvancedAnalyticsController {
  /**
   * تسجيل حدث تحليلي
   * POST /api/analytics/events
   */
  static async logEvent(req, res) {
    try {
      const {
        category,
        action,
        label,
        value = 0,
        metadata = {},
      } = req.body;

      const event = AdvancedAnalyticsService.logEvent({
        userId: req.user?.id,
        category,
        action,
        label,
        value,
        metadata,
      });

      res.status(201).json({
        success: true,
        message: 'تم تسجيل الحدث',
        en: 'Event logged',
        data: event,
      });
    } catch (error) {
      Logger.error(`Log event error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'فشل تسجيل الحدث',
        en: 'Failed to log event',
        error: error.message,
      });
    }
  }

  /**
   * تتبع المقياس
   * POST /api/analytics/metrics
   */
  static async trackMetric(req, res) {
    try {
      const { name, value, tags = {} } = req.body;

      if (!name || value === undefined) {
        return res.status(400).json({
          success: false,
          message: 'اسم المقياس والقيمة مطلوبة',
          en: 'Metric name and value are required',
        });
      }

      const metric = AdvancedAnalyticsService.trackMetric(name, value, tags);

      res.status(201).json({
        success: true,
        message: 'تم تتبع المقياس',
        en: 'Metric tracked',
        data: metric,
      });
    } catch (error) {
      Logger.error(`Track metric error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'فشل تتبع المقياس',
        en: 'Failed to track metric',
        error: error.message,
      });
    }
  }

  /**
   * إنشاء تقرير مخصص
   * POST /api/analytics/reports
   */
  static async generateReport(req, res) {
    try {
      const {
        name,
        type = 'summary',
        dateRange,
        metrics = [],
        groupBy = 'day',
        filters = {},
      } = req.body;

      if (!name || metrics.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'الاسم والمقاييس مطلوبة',
          en: 'Name and metrics are required',
        });
      }

      const report = AdvancedAnalyticsService.generateReport({
        name,
        type,
        dateRange,
        metrics,
        groupBy,
        filters,
      });

      Logger.info(`Report generated: ${report.id}`);

      res.status(201).json({
        success: true,
        message: 'تم إنشاء التقرير',
        en: 'Report generated',
        data: report,
      });
    } catch (error) {
      Logger.error(`Generate report error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'فشل إنشاء التقرير',
        en: 'Failed to generate report',
        error: error.message,
      });
    }
  }

  /**
   * التنبؤ بالقيم المستقبلية
   * POST /api/analytics/predict
   */
  static async predictValues(req, res) {
    try {
      const { metricName, periods = 7 } = req.body;

      if (!metricName) {
        return res.status(400).json({
          success: false,
          message: 'اسم المقياس مطلوب',
          en: 'Metric name is required',
        });
      }

      const predictions = AdvancedAnalyticsService.predictValues(
        metricName,
        periods
      );

      res.json({
        success: true,
        message: 'تم التنبؤ بالقيم',
        en: 'Values predicted',
        data: {
          metric: metricName,
          periods,
          predictions,
        },
      });
    } catch (error) {
      Logger.error(`Predict values error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'فشل التنبؤ',
        en: 'Failed to predict',
        error: error.message,
      });
    }
  }

  /**
   * جلب الشذوذ
   * GET /api/analytics/anomalies
   */
  static async getAnomalies(req, res) {
    try {
      const { severity = null, limit = 50 } = req.query;

      const anomalies = AdvancedAnalyticsService.getAnomalies({
        severity,
        limit: parseInt(limit),
      });

      res.json({
        success: true,
        message: 'تم جلب الشذوذ',
        en: 'Anomalies retrieved',
        data: {
          count: anomalies.length,
          anomalies,
        },
      });
    } catch (error) {
      Logger.error(`Get anomalies error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'فشل جلب الشذوذ',
        en: 'Failed to get anomalies',
        error: error.message,
      });
    }
  }

  /**
   * جلب الأحداث
   * GET /api/analytics/events
   */
  static async getEvents(req, res) {
    try {
      const { category = null, userId = null, limit = 100 } = req.query;

      const events = AdvancedAnalyticsService.getEvents({
        category,
        userId,
        limit: parseInt(limit),
      });

      res.json({
        success: true,
        message: 'تم جلب الأحداث',
        en: 'Events retrieved',
        data: {
          count: events.length,
          events,
        },
      });
    } catch (error) {
      Logger.error(`Get events error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'فشل جلب الأحداث',
        en: 'Failed to get events',
        error: error.message,
      });
    }
  }

  /**
   * إنشاء لوحة معلومات
   * POST /api/analytics/dashboards
   */
  static async createDashboard(req, res) {
    try {
      const {
        name,
        description,
        widgets = [],
        refreshInterval = 60000,
        isPublic = false,
      } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'اسم لوحة المعلومات مطلوب',
          en: 'Dashboard name is required',
        });
      }

      const dashboard = AdvancedAnalyticsService.createDashboard({
        name,
        description,
        widgets,
        refreshInterval,
        isPublic,
      });

      Logger.info(`Dashboard created: ${dashboard.id}`);

      res.status(201).json({
        success: true,
        message: 'تم إنشاء لوحة المعلومات',
        en: 'Dashboard created',
        data: dashboard,
      });
    } catch (error) {
      Logger.error(`Create dashboard error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'فشل إنشاء لوحة المعلومات',
        en: 'Failed to create dashboard',
        error: error.message,
      });
    }
  }

  /**
   * جلب بيانات لوحة المعلومات
   * GET /api/analytics/dashboards/:dashboardId
   */
  static async getDashboard(req, res) {
    try {
      const { dashboardId } = req.params;

      const dashboard = AdvancedAnalyticsService.getDashboardData(dashboardId);

      if (!dashboard) {
        return res.status(404).json({
          success: false,
          message: 'لوحة المعلومات غير موجودة',
          en: 'Dashboard not found',
        });
      }

      res.json({
        success: true,
        message: 'تم جلب لوحة المعلومات',
        en: 'Dashboard retrieved',
        data: dashboard,
      });
    } catch (error) {
      Logger.error(`Get dashboard error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'فشل جلب لوحة المعلومات',
        en: 'Failed to get dashboard',
        error: error.message,
      });
    }
  }

  /**
   * إضافة widget
   * POST /api/analytics/dashboards/:dashboardId/widgets
   */
  static async addWidget(req, res) {
    try {
      const { dashboardId } = req.params;
      const { title, metric, type, config = {} } = req.body;

      if (!title || !metric || !type) {
        return res.status(400).json({
          success: false,
          message: 'العنوان والمقياس والنوع مطلوبة',
          en: 'Title, metric, and type are required',
        });
      }

      const dashboard = AdvancedAnalyticsService.addWidgetToDashboard(
        dashboardId,
        {
          title,
          metric,
          type,
          config,
        }
      );

      res.status(201).json({
        success: true,
        message: 'تم إضافة الـ widget',
        en: 'Widget added',
        data: dashboard,
      });
    } catch (error) {
      Logger.error(`Add widget error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'فشل إضافة الـ widget',
        en: 'Failed to add widget',
        error: error.message,
      });
    }
  }

  /**
   * جلب التحليل المقارن
   * POST /api/analytics/compare
   */
  static async getComparativeAnalysis(req, res) {
    try {
      const { metrics, dateRange } = req.body;

      if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'المقاييس مطلوبة',
          en: 'Metrics array is required',
        });
      }

      const analysis = AdvancedAnalyticsService.getComparativeAnalysis(
        metrics,
        dateRange || {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date(),
        }
      );

      res.json({
        success: true,
        message: 'تم جلب التحليل',
        en: 'Analysis retrieved',
        data: analysis,
      });
    } catch (error) {
      Logger.error(`Comparative analysis error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'فشل جلب التحليل',
        en: 'Failed to get analysis',
        error: error.message,
      });
    }
  }

  /**
   * تصدير التقرير
   * GET /api/analytics/reports/:reportId/export
   */
  static async exportReport(req, res) {
    try {
      const { reportId } = req.params;
      const { format = 'json' } = req.query;

      const exportData = AdvancedAnalyticsService.exportReport(
        reportId,
        format
      );

      if (!exportData) {
        return res.status(404).json({
          success: false,
          message: 'التقرير غير موجود',
          en: 'Report not found',
        });
      }

      // Set appropriate content type based on format
      const contentTypes = {
        json: 'application/json',
        csv: 'text/csv',
        pdf: 'application/pdf',
      };

      res.setHeader('Content-Type', contentTypes[format] || 'application/json');
      res.send(exportData);
    } catch (error) {
      Logger.error(`Export report error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'فشل تصدير التقرير',
        en: 'Failed to export report',
        error: error.message,
      });
    }
  }

  /**
   * جلب الإحصائيات العامة
   * GET /api/analytics/stats
   */
  static async getStatistics(req, res) {
    try {
      const stats = AdvancedAnalyticsService.getStatistics();

      res.json({
        success: true,
        message: 'تم جلب الإحصائيات',
        en: 'Statistics retrieved',
        data: stats,
      });
    } catch (error) {
      Logger.error(`Get statistics error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'فشل جلب الإحصائيات',
        en: 'Failed to get statistics',
        error: error.message,
      });
    }
  }
}

module.exports = AdvancedAnalyticsController;
