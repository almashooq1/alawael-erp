/**
 * Performance Monitoring Middleware
 * Track and analyze system performance
 * Phase 11: System Integration
 */

const logger = require('../utils/logger');
const systemDashboard = require('../services/systemDashboard');

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: {},
      slowQueries: [],
      errors: [],
      throughput: 0,
      startTime: Date.now(),
    };
    this.slowThreshold = parseInt(process.env.SLOW_QUERY_MS || '100');
  }

  /**
   * Performance monitoring middleware
   */
  middleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      const routeKey = `${req.method} ${req.path}`;

      // Track original send method
      const originalSend = res.send;
      res.send = function (data) {
        res.send = originalSend;

        const duration = Date.now() - startTime;
        const success = res.statusCode < 400;

        // Record metrics
        this.recordMetric(routeKey, duration, success, res.statusCode);
        systemDashboard.recordMetric(duration, success);

        // Log slow requests
        if (duration > this.slowThreshold) {
          this.recordSlowQuery(routeKey, duration, req.query);
        }

        return res.send(data);
      }.bind(this);

      next();
    };
  }

  /**
   * Record request metric
   */
  recordMetric(route, duration, success, statusCode) {
    if (!this.metrics.requests[route]) {
      this.metrics.requests[route] = {
        count: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
        errors: 0,
        statusCodes: {},
      };
    }

    const metric = this.metrics.requests[route];
    metric.count++;
    metric.totalTime += duration;
    metric.minTime = Math.min(metric.minTime, duration);
    metric.maxTime = Math.max(metric.maxTime, duration);
    metric.statusCodes[statusCode] = (metric.statusCodes[statusCode] || 0) + 1;

    if (!success) {
      metric.errors++;
    }

    this.metrics.throughput++;
  }

  /**
   * Record slow query
   */
  recordSlowQuery(route, duration, params) {
    this.metrics.slowQueries.push({
      timestamp: new Date().toISOString(),
      route,
      duration,
      params: Object.keys(params).length > 0 ? params : null,
    });

    // Keep only last 100 slow queries
    if (this.metrics.slowQueries.length > 100) {
      this.metrics.slowQueries.shift();
    }

    logger.warn(`⚠️  Slow query detected: ${route} (${duration}ms)`);
  }

  /**
   * Get performance summary
   */
  getSummary() {
    const routes = Object.entries(this.metrics.requests).map(([route, data]) => ({
      route,
      requests: data.count,
      avgTime: Math.round(data.totalTime / data.count),
      minTime: data.minTime,
      maxTime: data.maxTime,
      errorRate: `${((data.errors / data.count) * 100).toFixed(2)}%`,
      statusCodes: data.statusCodes,
    }));

    const uptime = (Date.now() - this.metrics.startTime) / 1000;

    return {
      summary: {
        totalRequests: this.metrics.throughput,
        throughput: `${(this.metrics.throughput / uptime).toFixed(2)} req/s`,
        slowQueries: this.metrics.slowQueries.length,
        uptime: `${Math.floor(uptime)}s`,
      },
      topRoutes: routes.sort((a, b) => b.requests - a.requests).slice(0, 10),
      slowestRoutes: routes.sort((a, b) => b.avgTime - a.avgTime).slice(0, 10),
      recentSlowQueries: this.metrics.slowQueries.slice(-5),
    };
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      requests: {},
      slowQueries: [],
      errors: [],
      throughput: 0,
      startTime: Date.now(),
    };
  }
}

module.exports = new PerformanceMonitor();
