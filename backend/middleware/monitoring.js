/**
 * Comprehensive Monitoring & Analytics
 * نظام مراقبة متقدم مع تحليلات شاملة
 */

const os = require('os');

class MonitoringDashboard {
  constructor() {
    this.metrics = {
      requests: { total: 0, success: 0, error: 0, slow: 0 },
      performance: { minTime: Infinity, maxTime: 0, avgTime: 0 },
      errors: [],
      uptime: process.uptime(),
      startTime: Date.now(),
    };
    this.requestTimes = [];
  }

  /**
   * Record request
   */
  recordRequest(statusCode, responseTime) {
    this.metrics.requests.total++;

    if (statusCode >= 500) {
      this.metrics.requests.error++;
    } else if (statusCode >= 400) {
      this.metrics.requests.error++;
    } else {
      this.metrics.requests.success++;
    }

    if (responseTime > 100) {
      this.metrics.requests.slow++;
    }

    // Update performance metrics
    this.requestTimes.push(responseTime);
    this.metrics.performance.minTime = Math.min(this.metrics.performance.minTime, responseTime);
    this.metrics.performance.maxTime = Math.max(this.metrics.performance.maxTime, responseTime);

    // Calculate average (keep last 1000 requests)
    if (this.requestTimes.length > 1000) {
      this.requestTimes.shift();
    }
    const sum = this.requestTimes.reduce((a, b) => a + b, 0);
    this.metrics.performance.avgTime = (sum / this.requestTimes.length).toFixed(2);
  }

  /**
   * Record error
   */
  recordError(error, context = {}) {
    this.metrics.errors.push({
      message: error.message,
      code: error.code,
      timestamp: new Date().toISOString(),
      context,
      stack: error.stack?.split('\n').slice(0, 3),
    });

    // Keep only last 100 errors
    if (this.metrics.errors.length > 100) {
      this.metrics.errors.shift();
    }
  }

  /**
   * Get system metrics
   */
  getSystemMetrics() {
    const cpuUsage = process.cpuUsage();
    const memUsage = process.memoryUsage();

    return {
      cpu: {
        user: (cpuUsage.user / 1000).toFixed(2) + 'ms',
        system: (cpuUsage.system / 1000).toFixed(2) + 'ms',
      },
      memory: {
        heapUsed: (memUsage.heapUsed / 1024 / 1024).toFixed(2) + 'MB',
        heapTotal: (memUsage.heapTotal / 1024 / 1024).toFixed(2) + 'MB',
        rss: (memUsage.rss / 1024 / 1024).toFixed(2) + 'MB',
        percentage: ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(2) + '%',
      },
      uptime: this.formatUptime(process.uptime()),
    };
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    const memUsage = process.memoryUsage();
    const heapPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    const errorRate = (this.metrics.requests.error / this.metrics.requests.total) * 100 || 0;

    let status = 'healthy';
    const warnings = [];

    if (heapPercent > 80) {
      status = 'warning';
      warnings.push('High memory usage: ' + heapPercent.toFixed(2) + '%');
    }

    if (errorRate > 5) {
      status = 'warning';
      warnings.push('High error rate: ' + errorRate.toFixed(2) + '%');
    }

    if (this.metrics.requests.slow > this.metrics.requests.total * 0.1) {
      status = 'warning';
      warnings.push('Multiple slow requests detected');
    }

    if (heapPercent > 95 || errorRate > 20) {
      status = 'critical';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      warnings,
      checks: {
        memory: heapPercent <= 80 ? 'OK' : 'WARNING',
        errorRate: errorRate <= 5 ? 'OK' : 'WARNING',
        slowRequests:
          (this.metrics.requests.slow / this.metrics.requests.total) * 100 <= 10 ? 'OK' : 'WARNING',
      },
    };
  }

  /**
   * Get detailed dashboard
   */
  getDashboard() {
    return {
      status: this.getHealthStatus().status,
      timestamp: new Date().toISOString(),
      requests: {
        ...this.metrics.requests,
        successRate:
          ((this.metrics.requests.success / this.metrics.requests.total) * 100).toFixed(2) + '%',
        errorRate:
          ((this.metrics.requests.error / this.metrics.requests.total) * 100).toFixed(2) + '%',
        slowRate:
          ((this.metrics.requests.slow / this.metrics.requests.total) * 100).toFixed(2) + '%',
      },
      performance: this.metrics.performance,
      system: this.getSystemMetrics(),
      health: this.getHealthStatus(),
      recentErrors: this.metrics.errors.slice(-5),
      uptime: this.formatUptime(process.uptime()),
    };
  }

  /**
   * Format uptime
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  }

  /**
   * Get trends
   */
  getTrends() {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    const recentErrors = this.metrics.errors.filter(
      err => new Date(err.timestamp).getTime() > oneHourAgo
    );

    return {
      requestsLastHour: this.requestTimes.length,
      errorsLastHour: recentErrors.length,
      trend: recentErrors.length > 10 ? 'increasing' : 'normal',
      recommendation:
        recentErrors.length > 10 ? 'Monitor errors and investigate' : 'System performing normally',
    };
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      requests: { total: 0, success: 0, error: 0, slow: 0 },
      performance: { minTime: Infinity, maxTime: 0, avgTime: 0 },
      errors: [],
      uptime: process.uptime(),
      startTime: Date.now(),
    };
    this.requestTimes = [];
  }
}

// Singleton instance
const monitoring = new MonitoringDashboard();

/**
 * Monitoring middleware
 */
const monitoringMiddleware = (req, res, next) => {
  const startTime = Date.now();

  // Capture original send
  const originalSend = res.send;
  res.send = function (data) {
    res.send = originalSend;

    const duration = Date.now() - startTime;
    monitoring.recordRequest(res.statusCode, duration);

    return res.send(data);
  };

  next();
};

module.exports = {
  monitoring,
  monitoringMiddleware,
  MonitoringDashboard,
};
