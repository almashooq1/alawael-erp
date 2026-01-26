/**
 * Advanced Analytics Engine
 * محرك التحليلات المتقدمة
 *
 * Features:
 * - Real-time Data Processing
 * - Historical Trend Analysis
 * - Predictive Metrics
 * - Custom Reports
 * - Data Visualization Support
 */

class AdvancedAnalyticsEngine {
  constructor() {
    this.metrics = new Map();
    this.trends = [];
    this.alerts = [];
    this.startTime = Date.now();
  }

  /**
   * Track Metric
   */
  trackMetric(metricName, value, metadata = {}) {
    if (!this.metrics.has(metricName)) {
      this.metrics.set(metricName, []);
    }

    const metric = {
      value,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.get(metricName).push(metric);

    // Keep last 1000 entries per metric
    const data = this.metrics.get(metricName);
    if (data.length > 1000) {
      data.shift();
    }

    // Check for anomalies
    this.detectAnomalies(metricName, value);

    return metric;
  }

  /**
   * Get Metric Statistics
   */
  getMetricStats(metricName, timeRange = 3600000) {
    const data = this.metrics.get(metricName) || [];
    const now = Date.now();
    const filtered = data.filter(m => now - m.timestamp <= timeRange);

    if (filtered.length === 0) {
      return null;
    }

    const values = filtered.map(m => m.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;

    // Calculate standard deviation
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return {
      metricName,
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: avg.toFixed(2),
      stdDev: stdDev.toFixed(2),
      sum: sum.toFixed(2),
      timeRange,
      timestamp: now,
    };
  }

  /**
   * Get Trend Analysis
   */
  getTrendAnalysis(metricName, periods = 5) {
    const data = this.metrics.get(metricName) || [];
    if (data.length < periods * 2) {
      return null;
    }

    const periodSize = Math.floor(data.length / periods);
    const trends = [];

    for (let i = 0; i < periods; i++) {
      const start = i * periodSize;
      const end = start + periodSize;
      const periodData = data.slice(start, end);

      if (periodData.length === 0) continue;

      const avg = periodData.reduce((sum, m) => sum + m.value, 0) / periodData.length;
      trends.push({
        period: i + 1,
        average: avg.toFixed(2),
        count: periodData.length,
      });
    }

    // Calculate trend direction
    const direction =
      trends.length >= 2
        ? parseFloat(trends[trends.length - 1].average) > parseFloat(trends[0].average)
          ? 'INCREASING'
          : 'DECREASING'
        : 'STABLE';

    return {
      metricName,
      periods: trends,
      direction,
      trend: this.calculateTrendPercentage(trends),
    };
  }

  /**
   * Calculate Trend Percentage
   */
  calculateTrendPercentage(trends) {
    if (trends.length < 2) return 0;

    const first = parseFloat(trends[0].average);
    const last = parseFloat(trends[trends.length - 1].average);

    return (((last - first) / first) * 100).toFixed(2);
  }

  /**
   * Detect Anomalies
   */
  detectAnomalies(metricName, value) {
    const stats = this.getMetricStats(metricName);
    if (!stats) return;

    const avg = parseFloat(stats.avg);
    const stdDev = parseFloat(stats.stdDev);

    // Anomaly if value is more than 3 standard deviations away
    if (Math.abs(value - avg) > stdDev * 3) {
      this.addAlert(metricName, `ANOMALY_DETECTED`, {
        value,
        average: avg,
        threshold: stdDev * 3,
      });
    }
  }

  /**
   * Add Alert
   */
  addAlert(source, type, data) {
    const alert = {
      id: this.alerts.length + 1,
      source,
      type,
      data,
      timestamp: Date.now(),
      resolved: false,
    };

    this.alerts.push(alert);

    // Keep last 500 alerts
    if (this.alerts.length > 500) {
      this.alerts.shift();
    }

    return alert;
  }

  /**
   * Get Dashboard Data
   */
  getDashboardData() {
    const metricsData = [];

    this.metrics.forEach((data, name) => {
      const stats = this.getMetricStats(name);
      if (stats) {
        metricsData.push(stats);
      }
    });

    return {
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
      metrics: metricsData,
      activeAlerts: this.alerts.filter(a => !a.resolved).length,
      totalMetrics: this.metrics.size,
      totalAlerts: this.alerts.length,
    };
  }

  /**
   * Generate Report
   */
  generateReport(startTime, endTime) {
    const report = {
      reportId: `RPT-${Date.now()}`,
      generated: new Date().toISOString(),
      period: {
        start: new Date(startTime).toISOString(),
        end: new Date(endTime).toISOString(),
      },
      metrics: [],
      alerts: [],
      summary: {},
    };

    // Collect metrics for period
    this.metrics.forEach((data, name) => {
      const filtered = data.filter(m => m.timestamp >= startTime && m.timestamp <= endTime);

      if (filtered.length > 0) {
        const values = filtered.map(m => m.value);
        report.metrics.push({
          name,
          count: values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          avg: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
        });
      }
    });

    // Collect alerts for period
    report.alerts = this.alerts.filter(a => a.timestamp >= startTime && a.timestamp <= endTime);

    // Generate summary
    report.summary = {
      totalMetricsTracked: this.metrics.size,
      metricsWithData: report.metrics.length,
      alertsGenerated: report.alerts.length,
      resolvedAlerts: report.alerts.filter(a => a.resolved).length,
    };

    return report;
  }

  /**
   * Get Real-time Dashboard
   */
  getRealtimeDashboard() {
    const now = Date.now();
    const lastHour = now - 3600000;

    const dashboard = {
      timestamp: now,
      uptime: ((now - this.startTime) / 1000 / 60).toFixed(2) + ' minutes',
      metrics: {},
      performance: {},
      alerts: {
        total: this.alerts.length,
        active: this.alerts.filter(a => !a.resolved).length,
        recent: this.alerts.slice(-5),
      },
    };

    // Real-time metrics
    this.metrics.forEach((data, name) => {
      const recent = data.filter(m => m.timestamp >= lastHour);
      if (recent.length > 0) {
        dashboard.metrics[name] = {
          latest: recent[recent.length - 1].value,
          count: recent.length,
          change: this.calculateChange(recent),
        };
      }
    });

    return dashboard;
  }

  /**
   * Calculate Change
   */
  calculateChange(data) {
    if (data.length < 2) return 0;

    const old = data[0].value;
    const current = data[data.length - 1].value;

    return (((current - old) / old) * 100).toFixed(2) + '%';
  }

  /**
   * Export Data
   */
  exportData(format = 'json') {
    const data = {
      exportDate: new Date().toISOString(),
      metrics: {},
      alerts: this.alerts,
    };

    this.metrics.forEach((values, name) => {
      data.metrics[name] = values;
    });

    if (format === 'csv') {
      return this.convertToCSV(data);
    }

    return data;
  }

  /**
   * Convert to CSV
   */
  convertToCSV(data) {
    let csv = 'Metric,Value,Timestamp\n';

    Object.entries(data.metrics).forEach(([name, values]) => {
      values.forEach(v => {
        csv += `${name},${v.value},${new Date(v.timestamp).toISOString()}\n`;
      });
    });

    return csv;
  }

  /**
   * Clear Old Data
   */
  clearOldData(keepLastMs = 86400000) {
    const cutoff = Date.now() - keepLastMs;

    this.metrics.forEach((data, name) => {
      this.metrics.set(
        name,
        data.filter(m => m.timestamp > cutoff)
      );
    });

    this.alerts = this.alerts.filter(a => a.timestamp > cutoff);
  }
}

/**
 * Predictive Analytics Module
 */
class PredictiveAnalytics {
  /**
   * Forecast Next Value
   */
  static forecastValue(data, periods = 5) {
    if (data.length < periods) {
      return null;
    }

    // Simple moving average forecast
    const recentData = data.slice(-periods);
    const avg = recentData.reduce((sum, val) => sum + val, 0) / periods;

    // Calculate trend
    const trend = (recentData[periods - 1] - recentData[0]) / periods;

    // Forecast next value
    return (avg + trend).toFixed(2);
  }

  /**
   * Detect Seasonality
   */
  static detectSeasonality(data) {
    if (data.length < 24) return null;

    // Look for repeating patterns
    const patterns = {};

    for (let i = 0; i < data.length - 12; i++) {
      const pattern = JSON.stringify(data.slice(i, i + 12));
      patterns[pattern] = (patterns[pattern] || 0) + 1;
    }

    // Find most common pattern
    let maxPattern = null;
    let maxCount = 0;

    Object.entries(patterns).forEach(([pattern, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxPattern = pattern;
      }
    });

    return maxCount > 2 ? maxPattern : null;
  }

  /**
   * Predict Failures
   */
  static predictFailure(data, threshold = 0.8) {
    if (data.length === 0) return null;

    const avg = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);

    const latestValue = data[data.length - 1];
    const deviationScore = Math.abs(latestValue - avg) / stdDev;

    return {
      failureProbability: Math.min(100, deviationScore * 25).toFixed(2) + '%',
      isRisk: deviationScore > threshold,
      trend: latestValue > avg ? 'INCREASING' : 'DECREASING',
    };
  }
}

// Export
module.exports = {
  AdvancedAnalyticsEngine,
  PredictiveAnalytics,
};
