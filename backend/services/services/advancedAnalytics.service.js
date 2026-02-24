/**
 * نظام التحليلات والتقارير المتقدم
 * Advanced Analytics & Reporting Engine
 * 
 * Features:
 * - Real-time Data Pipeline
 * - Predictive Analytics
 * - Custom Report Generation
 * - Data Visualization
 * - Performance Metrics
 */

const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');

class AdvancedAnalyticsService extends EventEmitter {
  constructor() {
    super();
    this.metrics = new Map();
    this.events = [];
    this.reports = new Map();
    this.dashboards = new Map();
    this.dataPoints = [];
    this.predictions = new Map();
    this.trends = new Map();
    this.anomalies = [];
  }

  /**
   * تسجيل حدث تحليلي
   * Log analytics event
   * @param {Object} eventData - Event data
   * @returns {Object} - Recorded event
   */
  logEvent(eventData) {
    const {
      userId,
      category,
      action,
      label,
      value = 0,
      metadata = {},
    } = eventData;

    const event = {
      id: uuidv4(),
      timestamp: new Date(),
      userId,
      category,
      action,
      label,
      value,
      metadata,
    };

    this.events.push(event);
    this.dataPoints.push({
      timestamp: event.timestamp,
      category,
      value,
    });

    this.emit('event:logged', event);
    return event;
  }

  /**
   * تتبع المقياس
   * Track metric
   * @param {String} metricName - Metric name
   * @param {Number} value - Metric value
   * @param {Object} tags - Tag data
   * @returns {Object} - Recorded metric
   */
  trackMetric(metricName, value, tags = {}) {
    if (!this.metrics.has(metricName)) {
      this.metrics.set(metricName, []);
    }

    const metric = {
      id: uuidv4(),
      name: metricName,
      value,
      timestamp: new Date(),
      tags,
      aggregated: false,
    };

    this.metrics.get(metricName).push(metric);

    // التحقق من الشذوذ
    this.detectAnomaly(metricName, value);

    this.emit('metric:tracked', metric);
    return metric;
  }

  /**
   * الكشف عن الشذوذ
   * Detect anomalies in metrics
   * @param {String} metricName - Metric name
   * @param {Number} value - Current value
   */
  detectAnomaly(metricName, value) {
    const metrics = this.metrics.get(metricName) || [];

    if (metrics.length < 5) return;

    // حساب المتوسط والانحراف المعياري
    const values = metrics.slice(-10).map(m => m.value);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // إذا كانت القيمة أكثر من 3 انحرافات معيارية، إنها شذوذ
    if (Math.abs(value - avg) > 3 * stdDev) {
      const anomaly = {
        id: uuidv4(),
        metricName,
        value,
        expectedRange: {
          min: avg - 2 * stdDev,
          max: avg + 2 * stdDev,
        },
        detectedAt: new Date(),
        severity: Math.abs(value - avg) > 4 * stdDev ? 'critical' : 'warning',
      };

      this.anomalies.push(anomaly);
      this.emit('anomaly:detected', anomaly);
    }
  }

  /**
   * إنشاء تقرير مخصص
   * Generate custom report
   * @param {Object} config - Report configuration
   * @returns {Object} - Generated report
   */
  generateReport(config) {
    const {
      name,
      type, // 'summary', 'detailed', 'trend', 'comparison'
      dateRange = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      },
      metrics = [],
      groupBy = 'day',
      filters = {},
    } = config;

    const reportData = {
      id: uuidv4(),
      name,
      type,
      createdAt: new Date(),
      dateRange,
      metrics: {},
      summary: {},
      trends: {},
      comparisons: {},
    };

    // جمع البيانات للمقاييس المطلوبة
    metrics.forEach(metricName => {
      const metricData = this.metrics.get(metricName) || [];
      const filtered = metricData.filter(
        m =>
          m.timestamp >= dateRange.start && m.timestamp <= dateRange.end
      );

      reportData.metrics[metricName] = {
        total: filtered.length,
        values: filtered.map(m => m.value),
        avg:
          filtered.reduce((sum, m) => sum + m.value, 0) / filtered.length || 0,
        min: Math.min(...filtered.map(m => m.value)),
        max: Math.max(...filtered.map(m => m.value)),
        data: filtered,
      };

      // حساب الاتجاه
      reportData.trends[metricName] = this.calculateTrend(
        filtered,
        groupBy
      );
    });

    // إنشاء ملخص
    reportData.summary = this.generateSummary(reportData.metrics);

    this.reports.set(reportData.id, reportData);
    this.emit('report:generated', reportData);

    return reportData;
  }

  /**
   * حساب الاتجاه
   * Calculate trend
   * @param {Array} data - Data points
   * @param {String} groupBy - Group by period
   * @returns {Array} - Trend data
   */
  calculateTrend(data, groupBy = 'day') {
    if (data.length === 0) return [];

    // تجميع البيانات
    const grouped = {};

    data.forEach(point => {
      const key = this.getGroupKey(point.timestamp, groupBy);
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(point.value);
    });

    // حساب المتوسط لكل مجموعة
    const trend = Object.entries(grouped).map(([key, values]) => ({
      period: key,
      value: values.reduce((a, b) => a + b, 0) / values.length,
      count: values.length,
    }));

    return trend;
  }

  /**
   * الحصول على مفتاح التجميع
   * Get group key for period
   * @param {Date} date - Date object
   * @param {String} groupBy - Group by interval
   * @returns {String} - Group key
   */
  getGroupKey(date, groupBy) {
    const d = new Date(date);

    switch (groupBy) {
      case 'hour':
        return d.toISOString().slice(0, 13);
      case 'day':
        return d.toISOString().slice(0, 10);
      case 'week': {
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        return weekStart.toISOString().slice(0, 10);
      }
      case 'month':
        return d.toISOString().slice(0, 7);
      case 'year':
        return d.toISOString().slice(0, 4);
      default:
        return d.toISOString().slice(0, 10);
    }
  }

  /**
   * إنشاء ملخص التقرير
   * Generate report summary
   * @param {Object} metrics - Metrics data
   * @returns {Object} - Summary
   */
  generateSummary(metrics) {
    const summary = {
      metricsCount: Object.keys(metrics).length,
      totalDataPoints: 0,
      averageValues: {},
      keyMetrics: {},
    };

    Object.entries(metrics).forEach(([name, data]) => {
      summary.totalDataPoints += data.total;
      summary.averageValues[name] = data.avg;
      summary.keyMetrics[name] = {
        current: data.values[data.values.length - 1],
        previous: data.values[Math.max(0, data.values.length - 2)],
        change:
          ((data.values[data.values.length - 1] -
            data.values[Math.max(0, data.values.length - 2)]) /
            Math.abs(data.values[Math.max(0, data.values.length - 2)])) *
            100 || 0,
      };
    });

    return summary;
  }

  /**
   * التنبؤ بالقيم المستقبلية
   * Predict future values
   * @param {String} metricName - Metric name
   * @param {Number} periods - Number of periods to predict
   * @returns {Array} - Predictions
   */
  predictValues(metricName, periods = 7) {
    const metricData = this.metrics.get(metricName) || [];

    if (metricData.length < 3) {
      return [];
    }

    // استخدام خطي بسيط للتنبؤ
    const values = metricData.slice(-10).map(m => m.value);
    const n = values.length;

    // حساب الانحدار الخطي
    const xValues = Array.from({ length: n }, (_, i) => i);
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce(
      (sum, x, i) => sum + x * values[i],
      0
    );
    const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // التنبؤ
    const predictions = [];
    const lastX = n - 1;

    for (let i = 1; i <= periods; i++) {
      const predictedValue = slope * (lastX + i) + intercept;
      predictions.push({
        period: i,
        value: predictedValue,
        confidence: 0.85 - i * 0.05, // الثقة تنخفض مع المدة
      });
    }

    this.predictions.set(metricName, predictions);
    this.emit('prediction:generated', { metricName, predictions });

    return predictions;
  }

  /**
   * إنشاء لوحة معلومات
   * Create dashboard
   * @param {Object} config - Dashboard configuration
   * @returns {Object} - Created dashboard
   */
  createDashboard(config) {
    const {
      name,
      description,
      widgets = [],
      refreshInterval = 60000, // 1 minute
      isPublic = false,
    } = config;

    const dashboard = {
      id: uuidv4(),
      name,
      description,
      widgets,
      refreshInterval,
      isPublic,
      createdAt: new Date(),
      updatedAt: new Date(),
      viewCount: 0,
    };

    this.dashboards.set(dashboard.id, dashboard);
    this.emit('dashboard:created', dashboard);

    return dashboard;
  }

  /**
   * إضافة widget إلى لوحة المعلومات
   * Add widget to dashboard
   * @param {String} dashboardId - Dashboard ID
   * @param {Object} widget - Widget configuration
   * @returns {Object} - Updated dashboard
   */
  addWidgetToDashboard(dashboardId, widget) {
    const dashboard = this.dashboards.get(dashboardId);

    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    const newWidget = {
      id: uuidv4(),
      ...widget,
      addedAt: new Date(),
    };

    dashboard.widgets.push(newWidget);
    dashboard.updatedAt = new Date();

    this.emit('widget:added', { dashboardId, widget: newWidget });
    return dashboard;
  }

  /**
   * جلب بيانات لوحة المعلومات
   * Get dashboard data
   * @param {String} dashboardId - Dashboard ID
   * @returns {Object} - Dashboard with data
   */
  getDashboardData(dashboardId) {
    const dashboard = this.dashboards.get(dashboardId);

    if (!dashboard) {
      return null;
    }

    dashboard.viewCount++;

    // جمع بيانات Widgets
    const widgetData = dashboard.widgets.map(widget => {
      const metricData = this.metrics.get(widget.metric) || [];
      return {
        id: widget.id,
        type: widget.type,
        metric: widget.metric,
        data: metricData.slice(-100),
        title: widget.title,
      };
    });

    return {
      ...dashboard,
      widgetData,
      generatedAt: new Date(),
    };
  }

  /**
   * جلب تحليل مقارن
   * Get comparative analysis
   * @param {Array} metrics - Metrics to compare
   * @param {Object} dateRange - Date range
   * @returns {Object} - Comparison analysis
   */
  getComparativeAnalysis(metrics, dateRange) {
    const analysis = {
      metrics: {},
      comparison: {},
    };

    metrics.forEach(metricName => {
      const data = this.metrics.get(metricName) || [];
      const filtered = data.filter(
        m =>
          m.timestamp >= dateRange.start &&
          m.timestamp <= dateRange.end
      );

      const values = filtered.map(m => m.value);
      analysis.metrics[metricName] = {
        total: values.length,
        sum: values.reduce((a, b) => a + b, 0),
        avg: values.reduce((a, b) => a + b, 0) / values.length || 0,
        min: Math.min(...values),
        max: Math.max(...values),
      };
    });

    // مقارنة المقاييس
    if (metrics.length >= 2) {
      const values1 = Object.values(analysis.metrics)[0].avg;
      const values2 = Object.values(analysis.metrics)[1].avg;

      analysis.comparison = {
        variance: ((values2 - values1) / values1) * 100,
        trend: values2 > values1 ? 'increasing' : 'decreasing',
      };
    }

    return analysis;
  }

  /**
   * تصدير التقرير
   * Export report
   * @param {String} reportId - Report ID
   * @param {String} format - Export format (csv, json, pdf)
   * @returns {String} - Export data
   */
  exportReport(reportId, format = 'json') {
    const report = this.reports.get(reportId);

    if (!report) {
      return null;
    }

    switch (format) {
      case 'json':
        return JSON.stringify(report, null, 2);
      case 'csv':
        return this.reportToCSV(report);
      case 'pdf':
        return this.reportToPDF(report);
      default:
        return JSON.stringify(report);
    }
  }

  /**
   * تحويل التقرير إلى CSV
   * Convert report to CSV
   * @param {Object} report - Report object
   * @returns {String} - CSV data
   */
  reportToCSV(report) {
    let csv = `Report: ${report.name}\n`;
    csv += `Generated: ${report.createdAt}\n\n`;

    Object.entries(report.metrics).forEach(([name, data]) => {
      csv += `\n${name}\n`;
      csv += `Average,${data.avg}\n`;
      csv += `Min,${data.min}\n`;
      csv += `Max,${data.max}\n`;
    });

    return csv;
  }

  /**
   * تحويل التقرير إلى PDF
   * Convert report to PDF (placeholder)
   * @param {Object} report - Report object
   * @returns {String} - PDF data
   */
  reportToPDF(report) {
    // This is a placeholder - actual PDF generation would require a library
    return `PDF Report: ${report.name}`;
  }

  /**
   * جلب الشذوذ
   * Get detected anomalies
   * @param {Object} options - Filter options
   * @returns {Array} - Anomalies
   */
  getAnomalies(options = {}) {
    let anomalies = [...this.anomalies];

    if (options.severity) {
      anomalies = anomalies.filter(a => a.severity === options.severity);
    }

    if (options.limit) {
      anomalies = anomalies.slice(-options.limit);
    }

    return anomalies;
  }

  /**
   * جلب الأحداث
   * Get events
   * @param {Object} options - Filter options
   * @returns {Array} - Events
   */
  getEvents(options = {}) {
    let events = [...this.events];

    if (options.category) {
      events = events.filter(e => e.category === options.category);
    }

    if (options.userId) {
      events = events.filter(e => e.userId === options.userId);
    }

    if (options.limit) {
      events = events.slice(-options.limit);
    }

    return events;
  }

  /**
   * جلب إحصائيات عامة
   * Get overall statistics
   * @returns {Object} - Global statistics
   */
  getStatistics() {
    return {
      totalEvents: this.events.length,
      totalMetrics: this.metrics.size,
      totalReports: this.reports.size,
      totalDashboards: this.dashboards.size,
      totalAnomalies: this.anomalies.length,
      lastEventTime:
        this.events.length > 0
          ? this.events[this.events.length - 1].timestamp
          : null,
    };
  }
}

module.exports = new AdvancedAnalyticsService();
