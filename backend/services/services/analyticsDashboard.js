/**
 * Advanced Analytics Dashboard
 * Real-time system metrics and business analytics
 */

class AnalyticsDashboard {
  constructor() {
    this.metrics = {
      apiCalls: [],
      userActivity: [],
      errors: [],
      performance: [],
      businessMetrics: {}
    };

    this.startTime = Date.now();
  }

  /**
   * Record API call
   */
  recordAPICall(endpoint, method, duration, statusCode, userId = null) {
    this.metrics.apiCalls.push({
      timestamp: new Date().toISOString(),
      endpoint,
      method,
      duration,
      statusCode,
      userId,
      success: statusCode < 400
    });

    // Keep last 10000 records
    if (this.metrics.apiCalls.length > 10000) {
      this.metrics.apiCalls.shift();
    }
  }

  /**
   * Record user activity
   */
  recordUserActivity(userId, action, details = {}) {
    this.metrics.userActivity.push({
      timestamp: new Date().toISOString(),
      userId,
      action,
      details
    });

    // Keep last 5000 records
    if (this.metrics.userActivity.length > 5000) {
      this.metrics.userActivity.shift();
    }
  }

  /**
   * Record error
   */
  recordError(error, context = {}) {
    this.metrics.errors.push({
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      context
    });

    // Keep last 1000 records
    if (this.metrics.errors.length > 1000) {
      this.metrics.errors.shift();
    }
  }

  /**
   * Record performance metric
   */
  recordPerformance(metric, value) {
    this.metrics.performance.push({
      timestamp: new Date().toISOString(),
      metric,
      value
    });

    // Keep last 5000 records
    if (this.metrics.performance.length > 5000) {
      this.metrics.performance.shift();
    }
  }

  /**
   * Update business metrics
   */
  updateBusinessMetrics(key, value) {
    this.metrics.businessMetrics[key] = {
      value,
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Get dashboard summary
   */
  getDashboard(timeRange = 'hour') {
    const now = Date.now();
    const rangeMs = this.getTimeRangeMs(timeRange);
    const cutoff = now - rangeMs;

    const recentAPICalls = this.metrics.apiCalls.filter(
      call => new Date(call.timestamp).getTime() > cutoff
    );

    const recentErrors = this.metrics.errors.filter(
      err => new Date(err.timestamp).getTime() > cutoff
    );

    const avgResponseTime = recentAPICalls.length > 0
      ? recentAPICalls.reduce((sum, call) => sum + call.duration, 0) / recentAPICalls.length
      : 0;

    const errorRate = recentAPICalls.length > 0
      ? (recentAPICalls.filter(c => !c.success).length / recentAPICalls.length) * 100
      : 0;

    const throughput = (recentAPICalls.length / (rangeMs / 1000)) || 0; // requests per second

    return {
      timeRange,
      period: {
        start: new Date(cutoff).toISOString(),
        end: new Date(now).toISOString()
      },
      summary: {
        totalRequests: recentAPICalls.length,
        successfulRequests: recentAPICalls.filter(c => c.success).length,
        failedRequests: recentAPICalls.filter(c => !c.success).length,
        avgResponseTime: avgResponseTime.toFixed(2) + 'ms',
        errorRate: errorRate.toFixed(2) + '%',
        throughput: throughput.toFixed(2) + ' req/s',
        totalErrors: recentErrors.length
      },
      endpoints: this.getEndpointStats(recentAPICalls),
      errors: recentErrors.slice(-10),
      performanceMetrics: this.getPerformanceStats(timeRange),
      businessMetrics: this.metrics.businessMetrics
    };
  }

  /**
   * Get endpoint statistics
   */
  getEndpointStats(calls) {
    const stats = {};

    calls.forEach(call => {
      if (!stats[call.endpoint]) {
        stats[call.endpoint] = {
          endpoint: call.endpoint,
          calls: 0,
          avgDuration: 0,
          errorCount: 0,
          durations: []
        };
      }

      stats[call.endpoint].calls++;
      stats[call.endpoint].durations.push(call.duration);
      if (!call.success) {
        stats[call.endpoint].errorCount++;
      }
    });

    // Calculate averages
    Object.keys(stats).forEach(endpoint => {
      const data = stats[endpoint];
      data.avgDuration = (data.durations.reduce((a, b) => a + b, 0) / data.durations.length).toFixed(2);
      delete data.durations;
    });

    return stats;
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(timeRange) {
    const rangeMs = this.getTimeRangeMs(timeRange);
    const cutoff = Date.now() - rangeMs;

    const recentMetrics = this.metrics.performance.filter(
      m => new Date(m.timestamp).getTime() > cutoff
    );

    const stats = {};
    recentMetrics.forEach(m => {
      if (!stats[m.metric]) {
        stats[m.metric] = {
          values: [],
          min: Infinity,
          max: -Infinity,
          avg: 0
        };
      }

      stats[m.metric].values.push(m.value);
      stats[m.metric].min = Math.min(stats[m.metric].min, m.value);
      stats[m.metric].max = Math.max(stats[m.metric].max, m.value);
    });

    Object.keys(stats).forEach(metric => {
      const data = stats[metric];
      data.avg = (data.values.reduce((a, b) => a + b, 0) / data.values.length).toFixed(2);
      data.count = data.values.length;
      delete data.values;
    });

    return stats;
  }

  /**
   * Get time range in milliseconds
   */
  getTimeRangeMs(timeRange) {
    const ranges = {
      'minute': 60 * 1000,
      'hour': 60 * 60 * 1000,
      'day': 24 * 60 * 60 * 1000,
      'week': 7 * 24 * 60 * 60 * 1000,
      'month': 30 * 24 * 60 * 60 * 1000
    };

    return ranges[timeRange] || ranges['hour'];
  }

  /**
   * Get health recommendations
   */
  getHealthRecommendations() {
    const dashboard = this.getDashboard('hour');
    const recommendations = [];

    const errorRateNum = parseFloat(dashboard.summary.errorRate);
    if (errorRateNum > 5) {
      recommendations.push({
        severity: 'warning',
        message: 'High error rate detected. Review recent error logs.',
        errorRate: errorRateNum
      });
    }

    const avgResponseTime = parseFloat(dashboard.summary.avgResponseTime);
    if (avgResponseTime > 500) {
      recommendations.push({
        severity: 'warning',
        message: 'Slow response times detected. Consider optimization.',
        avgResponseTime
      });
    }

    const throughputNum = parseFloat(dashboard.summary.throughput);
    if (throughputNum > 1000) {
      recommendations.push({
        severity: 'info',
        message: 'High throughput detected. Monitor system resources.',
        throughput: throughputNum
      });
    }

    return {
      recommendations,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Export metrics for reporting
   */
  exportMetrics(format = 'json') {
    const data = {
      exportedAt: new Date().toISOString(),
      systemUptime: Math.floor((Date.now() - this.startTime) / 1000) + ' seconds',
      metrics: this.metrics
    };

    if (format === 'csv') {
      return this.convertToCSV(data);
    }

    return data;
  }

  /**
   * Convert metrics to CSV
   */
  convertToCSV(data) {
    let csv = 'Timestamp,Type,Value,Details\n';

    data.metrics.apiCalls.forEach(call => {
      csv += `${call.timestamp},API_CALL,"${call.endpoint}","Method: ${call.method}, Duration: ${call.duration}ms"\n`;
    });

    data.metrics.errors.forEach(err => {
      csv += `${err.timestamp},ERROR,"${err.message}","Context: ${JSON.stringify(err.context)}"\n`;
    });

    return csv;
  }
}

module.exports = new AnalyticsDashboard();
