/**
 * Performance Metrics System
 * نظام قياس الأداء المتقدم
 *
 * Features:
 * - Request duration tracking
 * - Memory usage monitoring
 * - Database query performance
 * - API endpoint statistics
 * - Real-time metrics aggregation
 */

const logger = require('./logger');

class PerformanceMetrics {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        errors: 0,
        byMethod: {},
        byEndpoint: {},
        durations: [],
      },
      database: {
        queries: 0,
        slowQueries: 0,
        avgQueryTime: 0,
        queryTimes: [],
      },
      memory: {
        samples: [],
        maxHeapUsed: 0,
        avgHeapUsed: 0,
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
      },
    };

    // Store interval ID for cleanup
    this.periodicCollectionInterval = null;

    // Start periodic metrics collection (only in non-test environments)
    if (process.env.NODE_ENV !== 'test') {
      this.startPeriodicCollection();
    }
  }

  /**
   * Track HTTP request
   */
  trackRequest(req, res, duration) {
    const method = req.method;
    const endpoint = this.normalizeEndpoint(req.path);
    const statusCode = res.statusCode;

    // Update totals
    this.metrics.requests.total++;
    if (statusCode >= 200 && statusCode < 400) {
      this.metrics.requests.success++;
    } else if (statusCode >= 400) {
      this.metrics.requests.errors++;
    }

    // Track by method
    this.metrics.requests.byMethod[method] = (this.metrics.requests.byMethod[method] || 0) + 1;

    // Track by endpoint
    if (!this.metrics.requests.byEndpoint[endpoint]) {
      this.metrics.requests.byEndpoint[endpoint] = {
        count: 0,
        durations: [],
        errors: 0,
      };
    }
    this.metrics.requests.byEndpoint[endpoint].count++;
    this.metrics.requests.byEndpoint[endpoint].durations.push(duration);
    if (statusCode >= 400) {
      this.metrics.requests.byEndpoint[endpoint].errors++;
    }

    // Track duration
    this.metrics.requests.durations.push(duration);

    // Keep only last 1000 durations
    if (this.metrics.requests.durations.length > 1000) {
      this.metrics.requests.durations.shift();
    }

    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        method,
        endpoint,
        duration: `${duration}ms`,
        statusCode,
      });
    }
  }

  /**
   * Track database query
   */
  trackDatabaseQuery(queryName, duration) {
    this.metrics.database.queries++;
    this.metrics.database.queryTimes.push(duration);

    // Keep only last 1000 query times
    if (this.metrics.database.queryTimes.length > 1000) {
      this.metrics.database.queryTimes.shift();
    }

    // Calculate average
    const sum = this.metrics.database.queryTimes.reduce((a, b) => a + b, 0);
    this.metrics.database.avgQueryTime = sum / this.metrics.database.queryTimes.length;

    // Track slow queries (> 100ms)
    if (duration > 100) {
      this.metrics.database.slowQueries++;
      logger.warn('Slow database query', {
        query: queryName,
        duration: `${duration}ms`,
      });
    }
  }

  /**
   * Track cache hit/miss
   */
  trackCache(isHit) {
    if (isHit) {
      this.metrics.cache.hits++;
    } else {
      this.metrics.cache.misses++;
    }

    // Calculate hit rate
    const total = this.metrics.cache.hits + this.metrics.cache.misses;
    this.metrics.cache.hitRate = total > 0 ? (this.metrics.cache.hits / total) * 100 : 0;
  }

  /**
   * Normalize endpoint for grouping
   */
  normalizeEndpoint(path) {
    // Replace IDs with :id placeholder
    return path
      .replace(/\/[0-9a-f]{24}\b/gi, '/:id') // MongoDB ObjectId
      .replace(/\/\d+\b/g, '/:id') // Numeric IDs
      .replace(/\/[a-f0-9-]{36}\b/gi, '/:uuid'); // UUIDs
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics() {
    const durations = this.metrics.requests.durations;
    const avgDuration =
      durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    const p95Duration = this.calculatePercentile(durations, 95);
    const p99Duration = this.calculatePercentile(durations, 99);

    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      requests: {
        total: this.metrics.requests.total,
        success: this.metrics.requests.success,
        errors: this.metrics.requests.errors,
        successRate:
          this.metrics.requests.total > 0
            ? ((this.metrics.requests.success / this.metrics.requests.total) * 100).toFixed(2)
            : 0,
        avgDuration: avgDuration.toFixed(2),
        p95Duration: p95Duration.toFixed(2),
        p99Duration: p99Duration.toFixed(2),
        byMethod: this.metrics.requests.byMethod,
        topEndpoints: this.getTopEndpoints(10),
      },
      database: {
        totalQueries: this.metrics.database.queries,
        slowQueries: this.metrics.database.slowQueries,
        avgQueryTime: this.metrics.database.avgQueryTime.toFixed(2),
      },
      cache: {
        hits: this.metrics.cache.hits,
        misses: this.metrics.cache.misses,
        hitRate: this.metrics.cache.hitRate.toFixed(2),
      },
      memory: {
        heapUsed: this.formatBytes(process.memoryUsage().heapUsed),
        heapTotal: this.formatBytes(process.memoryUsage().heapTotal),
        external: this.formatBytes(process.memoryUsage().external),
        rss: this.formatBytes(process.memoryUsage().rss),
      },
    };
  }

  /**
   * Get top endpoints by request count
   */
  getTopEndpoints(limit = 10) {
    return Object.entries(this.metrics.requests.byEndpoint)
      .map(([endpoint, data]) => ({
        endpoint,
        count: data.count,
        avgDuration:
          data.durations.length > 0
            ? (data.durations.reduce((a, b) => a + b, 0) / data.durations.length).toFixed(2)
            : 0,
        errors: data.errors,
        errorRate: ((data.errors / data.count) * 100).toFixed(2),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Calculate percentile
   */
  calculatePercentile(arr, percentile) {
    if (arr.length === 0) return 0;

    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * Start periodic metrics collection
   */
  startPeriodicCollection() {
    // Collect memory metrics every 30 seconds
    this.periodicCollectionInterval = setInterval(() => {
      const memUsage = process.memoryUsage();
      this.metrics.memory.samples.push(memUsage.heapUsed);

      // Keep only last 100 samples
      if (this.metrics.memory.samples.length > 100) {
        this.metrics.memory.samples.shift();
      }

      // Update max and average
      this.metrics.memory.maxHeapUsed = Math.max(
        this.metrics.memory.maxHeapUsed,
        memUsage.heapUsed
      );
      const sum = this.metrics.memory.samples.reduce((a, b) => a + b, 0);
      this.metrics.memory.avgHeapUsed = sum / this.metrics.memory.samples.length;

      // Log if memory usage is high (> 80%)
      const percentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      if (percentage > 80) {
        logger.warn('High memory usage detected', {
          heapUsed: this.formatBytes(memUsage.heapUsed),
          heapTotal: this.formatBytes(memUsage.heapTotal),
          percentage: `${percentage.toFixed(2)}%`,
        });
      }
    }, 30000);
  }

  /**
   * Stop periodic metrics collection
   */
  stopPeriodicCollection() {
    if (this.periodicCollectionInterval) {
      clearInterval(this.periodicCollectionInterval);
      this.periodicCollectionInterval = null;
    }
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        errors: 0,
        byMethod: {},
        byEndpoint: {},
        durations: [],
      },
      database: {
        queries: 0,
        slowQueries: 0,
        avgQueryTime: 0,
        queryTimes: [],
      },
      memory: {
        samples: [],
        maxHeapUsed: 0,
        avgHeapUsed: 0,
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
      },
    };

    logger.info('Performance metrics reset');
  }
}

// Create singleton instance
const performanceMetrics = new PerformanceMetrics();

/**
 * Express middleware for automatic request tracking
 */
const metricsMiddleware = (req, res, next) => {
  const startTime = Date.now();

  // Capture response
  const originalSend = res.send;
  res.send = function (data) {
    res.send = originalSend;
    const duration = Date.now() - startTime;

    // Track request
    performanceMetrics.trackRequest(req, res, duration);

    return res.send(data);
  };

  next();
};

/**
 * Get metrics endpoint handler
 */
const getMetricsHandler = (req, res) => {
  const metrics = performanceMetrics.getMetrics();
  res.json({
    success: true,
    data: metrics,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Reset metrics endpoint handler (admin only)
 */
const resetMetricsHandler = (req, res) => {
  performanceMetrics.reset();
  res.json({
    success: true,
    message: 'Performance metrics reset successfully',
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  performanceMetrics,
  metricsMiddleware,
  getMetricsHandler,
  resetMetricsHandler,
};
