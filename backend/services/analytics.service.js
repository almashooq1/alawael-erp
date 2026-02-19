/**
 * ADVANCED ANALYTICS SERVICE
 * Real-time metrics, dashboards, and business intelligence
 * AlAwael ERP v1.4 | 2026-02-07
 */

const { Analytics, Dashboard, Report, Alert } = require('../models/Analytics.model');
const { v4: uuidv4 } = require('uuid');

// ============================================================================
// ANALYTICS SERVICE
// ============================================================================

class AnalyticsService {
  /**
   * TRACK METRIC
   * Record a new metric value with automatic calculations
   */
  async trackMetric(metricData) {
    try {
      const {
        metricName,
        category,
        value,
        dimensions = {},
        tags = [],
        dataSource = 'system'
      } = metricData;

      // Calculate time fields
      const now = new Date();
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const week = this._getWeekNumber(now);
      const quarter = Math.ceil((now.getMonth() + 1) / 3);

      // Get previous value for comparison
      const previousMetric = await this._getPreviousMetric(metricName, date);
      const previousValue = previousMetric?.value || 0;

      // Calculate percentage change
      const percentageChange = previousValue !== 0
        ? ((value - previousValue) / previousValue) * 100
        : 0;

      // Determine trend
      const trend = value > previousValue ? 'increasing'
        : value < previousValue ? 'decreasing'
        : 'stable';

      // Check for anomaly
      const { isAnomaly, score } = await this._detectAnomaly(metricName, value);

      const metric = {
        id: uuidv4(),
        metricName,
        category,
        timestamp: now,
        date,
        hour: now.getHours(),
        day: now.getDate(),
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        week,
        quarter,
        value,
        previousValue,
        count: 1,
        percentageChange,
        trend,
        dimensions,
        tags,
        dataSource,
        isAnomaly,
        anomalyScore: score
      };

      // Store metric
      await Analytics.create(metric);

      // Trigger alerts if applicable
      await this._checkAlerts(metricName, value);

      return { success: true, metric };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * GET METRIC SUMMARY
   * Retrieve aggregated metrics for a time period
   */
  async getMetricSummary(metricName, timeRange = 'daily') {
    try {
      const metrics = await this._getMetricsForRange(metricName, timeRange);

      if (metrics.length === 0) {
        return {
          success: true,
          summary: {
            metricName,
            count: 0,
            totalValue: 0,
            avgValue: 0,
            maxValue: 0,
            minValue: 0,
            trend: 'no_data'
          }
        };
      }

      const values = metrics.map(m => m.value);
      const totalValue = values.reduce((a, b) => a + b, 0);
      const avgValue = totalValue / values.length;
      const maxValue = Math.max(...values);
      const minValue = Math.min(...values);
      const stdDev = this._calculateStdDev(values, avgValue);

      // Determine overall trend
      const firstHalf = values.slice(0, Math.floor(values.length / 2));
      const secondHalf = values.slice(Math.floor(values.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      const trend = secondAvg >= firstAvg ? 'improving' : 'declining';

      return {
        success: true,
        summary: {
          metricName,
          timeRange,
          count: metrics.length,
          totalValue,
          avgValue: parseFloat(avgValue.toFixed(2)),
          maxValue,
          minValue,
          stdDev: parseFloat(stdDev.toFixed(2)),
          trend,
          dataPoints: metrics.length
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * GET COMPARISON METRICS
   * Compare metrics across time periods
   */
  async compareMetrics(metricName, fromDate, toDate, compareWithPeriod = 'previous') {
    try {
      const currentMetrics = await Analytics.find({
        metricName,
        date: { $gte: fromDate, $lte: toDate }
      });

      let previousMetrics = [];
      if (compareWithPeriod === 'previous') {
        const dayDiff = toDate - fromDate;
        const previousFrom = new Date(fromDate.getTime() - dayDiff);
        const previousTo = new Date(fromDate.getTime() - 1000 * 60 * 60 * 24);

        previousMetrics = await Analytics.find({
          metricName,
          date: { $gte: previousFrom, $lte: previousTo }
        });
      }

      const currentSum = currentMetrics.reduce((sum, m) => sum + m.value, 0);
      const previousSum = previousMetrics.reduce((sum, m) => sum + m.value, 0);
      const change = previousSum !== 0 ? ((currentSum - previousSum) / previousSum) * 100 : 0;

      return {
        success: true,
        comparison: {
          metricName,
          currentPeriod: {
            sum: currentSum,
            avg: currentSum / currentMetrics.length,
            count: currentMetrics.length
          },
          previousPeriod: {
            sum: previousSum,
            avg: previousSum / previousMetrics.length,
            count: previousMetrics.length
          },
          percentageChange: parseFloat(change.toFixed(2)),
          direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * CREATE DASHBOARD
   * Create a new analytics dashboard with widgets
   */
  async createDashboard(dashboardData) {
    try {
      const {
        name,
        description,
        owner,
        department,
        widgets = [],
        visibility = 'private'
      } = dashboardData;

      const dashboard = {
        id: uuidv4(),
        name,
        description,
        owner,
        department,
        widgets,
        visibility,
        sharedWith: [],
        refreshInterval: 300000, // 5 minutes
        cacheEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 0
      };

      await Dashboard.create(dashboard);

      return { success: true, dashboard };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * GET DASHBOARD DATA
   * Retrieve all dashboard data including widgets and metrics
   */
  async getDashboardData(dashboardId) {
    try {
      const dashboard = await Dashboard.findOne({ id: dashboardId });

      if (!dashboard) {
        return { success: false, error: 'Dashboard not found' };
      }

      // Increment access count
      dashboard.accessCount += 1;
      dashboard.lastAccessedAt = new Date();
      await dashboard.save();

      // Gather metric data for all widgets
      const widgetData = await Promise.all(
        dashboard.widgets.map(async (widget) => {
          const metrics = await Promise.all(
            widget.metrics.map(metricName =>
              this.getMetricSummary(metricName, 'daily')
            )
          );

          return {
            ...widget,
            data: metrics
          };
        })
      );

      return {
        success: true,
        dashboard: {
          ...dashboard.toObject(),
          widgets: widgetData
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * CREATE REPORT
   * Create a scheduled report
   */
  async createReport(reportData) {
    try {
      const {
        title,
        description,
        reportType,
        metrics = [],
        timeRange = {},
        schedule = {},
        recipients = {},
        format = 'pdf'
      } = reportData;

      const report = {
        id: uuidv4(),
        title,
        description,
        reportType,
        metrics,
        timeRange,
        schedule: {
          frequency: schedule.frequency || 'monthly',
          enabled: schedule.enabled || false,
          ...schedule
        },
        recipients,
        format,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        executionCount: 0
      };

      await Report.create(report);

      return { success: true, report };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * GENERATE REPORT
   * Generate and return report data
   */
  async generateReport(reportId) {
    try {
      const report = await Report.findOne({ id: reportId });

      if (!report) {
        return { success: false, error: 'Report not found' };
      }

      // Gather metrics
      const metricsData = await Promise.all(
        report.metrics.map(metricName =>
          this.getMetricSummary(metricName, 'daily')
        )
      );

      // Increment execution count
      report.executionCount += 1;
      report.lastRun = new Date();
      report.status = 'completed';
      await report.save();

      return {
        success: true,
        report: {
          ...report.toObject(),
          generatedAt: new Date(),
          metricsData,
          format: report.format
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * CREATE ALERT
   * Create a metric alert
   */
  async createAlert(alertData) {
    try {
      const {
        name,
        description,
        metric,
        condition = {},
        actions = [],
        createdBy
      } = alertData;

      const alert = {
        id: uuidv4(),
        name,
        description,
        metric,
        condition,
        actions: actions.map(action => ({
          ...action,
          priority: action.priority || 'medium'
        })),
        triggerCount: 0,
        enabled: true,
        triggers: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy
      };

      await Alert.create(alert);

      return { success: true, alert };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * DETECT ANOMALIES
   * Identify anomalous metric values using statistical methods
   */
  async detectAnomalies(metricName, window = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - window);

      const metrics = await Analytics.find({
        metricName,
        date: { $gte: startDate }
      });

      if (metrics.length < 3) {
        return {
          success: true,
          anomalies: [],
          message: 'Insufficient data for anomaly detection'
        };
      }

      const values = metrics.map(m => m.value);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const stdDev = this._calculateStdDev(values, mean);
      const threshold = 2; // 2 standard deviations

      const anomalies = metrics
        .map((metric, index) => ({
          ...metric.toObject(),
          zScore: Math.abs((metric.value - mean) / stdDev),
          isAnomaly: Math.abs((metric.value - mean) / stdDev) > threshold
        }))
        .filter(m => m.isAnomaly);

      return {
        success: true,
        anomalies,
        stats: {
          mean,
          stdDev,
          threshold,
          totalPoints: metrics.length,
          anomalyCount: anomalies.length
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * GET TRENDING METRICS
   * Get top trending metrics in a category
   */
  async getTrendingMetrics(category, limit = 10) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const metrics = await Analytics.aggregate([
        {
          $match: {
            category,
            date: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: '$metricName',
            avgValue: { $avg: '$value' },
            maxChange: { $max: '$percentageChange' },
            count: { $sum: 1 },
            trend: { $first: '$trend' }
          }
        },
        {
          $sort: { maxChange: -1 }
        },
        {
          $limit: limit
        }
      ]);

      return {
        success: true,
        trending: metrics
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  async _getPreviousMetric(metricName, currentDate) {
    const previousDate = new Date(currentDate);
    previousDate.setDate(previousDate.getDate() - 1);

    return Analytics.findOne({
      metricName,
      date: { $lt: currentDate }
    }).sort({ date: -1 });
  }

  async _detectAnomaly(metricName, value) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const metrics = await Analytics.find({
      metricName,
      date: { $gte: thirtyDaysAgo }
    });

    if (metrics.length < 3) {
      return { isAnomaly: false, score: 0 };
    }

    const values = metrics.map(m => m.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = this._calculateStdDev(values, mean);
    const zScore = Math.abs((value - mean) / stdDev);
    const isAnomaly = zScore > 3;

    return {
      isAnomaly,
      score: Math.min(zScore / 3, 1)
    };
  }

  async _checkAlerts(metricName, value) {
    const alerts = await Alert.find({
      metric: metricName,
      enabled: true
    });

    for (const alert of alerts) {
      const triggered = this._evaluateCondition(alert.condition, value);
      if (triggered) {
        await this._triggerAlert(alert, value);
      }
    }
  }

  _evaluateCondition(condition, value) {
    const { operator, threshold } = condition;

    switch (operator) {
      case 'greater':
        return value > threshold;
      case 'less':
        return value < threshold;
      case 'equals':
        return value === threshold;
      case 'between':
        return value >= condition.min && value <= condition.max;
      default:
        return false;
    }
  }

  async _triggerAlert(alert, value) {
    alert.triggerCount += 1;
    alert.lastTriggered = new Date();
    alert.triggers.push({
      triggeredAt: new Date(),
      value,
      message: `Alert triggered: ${alert.metric} = ${value}`
    });

    await alert.save();
  }

  _getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  _calculateStdDev(values, mean) {
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  async _getMetricsForRange(metricName, timeRange) {
    const now = new Date();
    let startDate = new Date();

    switch (timeRange) {
      case 'hourly':
        startDate.setHours(startDate.getHours() - 1);
        break;
      case 'daily':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'weekly':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'yearly':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    return Analytics.find({
      metricName,
      date: { $gte: startDate, $lte: now }
    }).sort({ date: 1 });
  }
}

module.exports = new AnalyticsService();
