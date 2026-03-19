/**
 * Performance Optimization Service
 * Automatic performance monitoring and optimization
 */

const { performance, PerformanceObserver } = require('perf_hooks');
const { logger } = require('../middleware/logger');

class PerformanceOptimizer {
  constructor() {
    this.metrics = {
      slowFunctions: new Map(),
      apiEndpoints: new Map(),
      databaseQueries: new Map(),
    };

    this.thresholds = {
      slowFunction: 100, // ms
      slowAPI: 500, // ms
      slowQuery: 200, // ms
    };

    this.setupPerformanceObserver();
  }

  /**
   * Setup performance observer
   */
  setupPerformanceObserver() {
    const obs = new PerformanceObserver(items => {
      items.getEntries().forEach(entry => {
        if (entry.duration > this.thresholds.slowFunction) {
          this.recordSlowFunction(entry.name, entry.duration);
        }
      });
    });

    obs.observe({ entryTypes: ['measure'], buffered: true });
  }

  /**
   * Measure function execution time
   */
  measureFunction(name, fn) {
    return async (...args) => {
      const startMark = `${name}-start-${Date.now()}`;
      const endMark = `${name}-end-${Date.now()}`;

      performance.mark(startMark);

      try {
        const result = await fn(...args);
        performance.mark(endMark);
        performance.measure(name, startMark, endMark);
        return result;
      } catch (error) {
        performance.mark(endMark);
        performance.measure(name, startMark, endMark);
        throw error;
      }
    };
  }

  /**
   * Record slow function
   */
  recordSlowFunction(name, duration) {
    if (!this.metrics.slowFunctions.has(name)) {
      this.metrics.slowFunctions.set(name, {
        count: 0,
        totalDuration: 0,
        maxDuration: 0,
        minDuration: Infinity,
      });
    }

    const metric = this.metrics.slowFunctions.get(name);
    metric.count++;
    metric.totalDuration += duration;
    metric.maxDuration = Math.max(metric.maxDuration, duration);
    metric.minDuration = Math.min(metric.minDuration, duration);

    logger.warn('Slow function detected', {
      function: name,
      duration: `${duration.toFixed(2)}ms`,
      avgDuration: `${(metric.totalDuration / metric.count).toFixed(2)}ms`,
      count: metric.count,
    });
  }

  /**
   * API endpoint performance tracking middleware
   */
  trackEndpointPerformance(req, res, next) {
    const startTime = performance.now();
    const endpoint = `${req.method} ${req.route?.path || req.path}`;

    res.on('finish', () => {
      const duration = performance.now() - startTime;

      if (!this.metrics.apiEndpoints.has(endpoint)) {
        this.metrics.apiEndpoints.set(endpoint, {
          count: 0,
          totalDuration: 0,
          maxDuration: 0,
          avgDuration: 0,
          statusCodes: {},
        });
      }

      const metric = this.metrics.apiEndpoints.get(endpoint);
      metric.count++;
      metric.totalDuration += duration;
      metric.maxDuration = Math.max(metric.maxDuration, duration);
      metric.avgDuration = metric.totalDuration / metric.count;

      const statusCode = res.statusCode.toString();
      metric.statusCodes[statusCode] = (metric.statusCodes[statusCode] || 0) + 1;

      // Log slow API calls
      if (duration > this.thresholds.slowAPI) {
        logger.warn('Slow API endpoint', {
          endpoint,
          duration: `${duration.toFixed(2)}ms`,
          avgDuration: `${metric.avgDuration.toFixed(2)}ms`,
          count: metric.count,
        });
      }

      // Add performance header
      res.setHeader('X-Performance-Duration', `${duration.toFixed(2)}ms`);
      res.setHeader('X-Performance-Avg', `${metric.avgDuration.toFixed(2)}ms`);
    });

    next();
  }

  /**
   * Database query performance tracking
   */
  trackQueryPerformance(query, duration) {
    if (!this.metrics.databaseQueries.has(query)) {
      this.metrics.databaseQueries.set(query, {
        count: 0,
        totalDuration: 0,
        maxDuration: 0,
        avgDuration: 0,
      });
    }

    const metric = this.metrics.databaseQueries.get(query);
    metric.count++;
    metric.totalDuration += duration;
    metric.maxDuration = Math.max(metric.maxDuration, duration);
    metric.avgDuration = metric.totalDuration / metric.count;

    if (duration > this.thresholds.slowQuery) {
      logger.warn('Slow database query', {
        query: query.substring(0, 100) + '...',
        duration: `${duration.toFixed(2)}ms`,
        avgDuration: `${metric.avgDuration.toFixed(2)}ms`,
        count: metric.count,
      });
    }
  }

  /**
   * Get performance report
   */
  getPerformanceReport() {
    return {
      slowFunctions: Array.from(this.metrics.slowFunctions.entries())
        .map(([name, metric]) => ({
          name,
          ...metric,
          avgDuration: metric.totalDuration / metric.count,
        }))
        .sort((a, b) => b.avgDuration - a.avgDuration)
        .slice(0, 10),

      apiEndpoints: Array.from(this.metrics.apiEndpoints.entries())
        .map(([endpoint, metric]) => ({
          endpoint,
          ...metric,
        }))
        .sort((a, b) => b.avgDuration - a.avgDuration)
        .slice(0, 20),

      databaseQueries: Array.from(this.metrics.databaseQueries.entries())
        .map(([query, metric]) => ({
          query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
          ...metric,
        }))
        .sort((a, b) => b.avgDuration - a.avgDuration)
        .slice(0, 10),

      summary: {
        totalSlowFunctions: this.metrics.slowFunctions.size,
        totalAPIEndpoints: this.metrics.apiEndpoints.size,
        totalQueries: this.metrics.databaseQueries.size,
      },
    };
  }

  /**
   * Get optimization suggestions
   */
  getOptimizationSuggestions() {
    const suggestions = [];

    // Check slow functions
    this.metrics.slowFunctions.forEach((metric, name) => {
      if (metric.avgDuration > this.thresholds.slowFunction * 2) {
        suggestions.push({
          type: 'function',
          severity: 'high',
          target: name,
          issue: `Average execution time: ${(metric.totalDuration / metric.count).toFixed(2)}ms`,
          suggestion: 'Consider optimizing algorithm or adding caching',
        });
      }
    });

    // Check slow API endpoints
    this.metrics.apiEndpoints.forEach((metric, endpoint) => {
      if (metric.avgDuration > this.thresholds.slowAPI * 2) {
        suggestions.push({
          type: 'api',
          severity: 'high',
          target: endpoint,
          issue: `Average response time: ${metric.avgDuration.toFixed(2)}ms`,
          suggestion: 'Consider adding caching, pagination, or optimizing database queries',
        });
      }
    });

    // Check slow queries
    this.metrics.databaseQueries.forEach((metric, query) => {
      if (metric.avgDuration > this.thresholds.slowQuery * 2) {
        suggestions.push({
          type: 'database',
          severity: 'high',
          target: query.substring(0, 50) + '...',
          issue: `Average query time: ${metric.avgDuration.toFixed(2)}ms`,
          suggestion: 'Add indexes, optimize query structure, or use query caching',
        });
      }
    });

    return suggestions.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics.slowFunctions.clear();
    this.metrics.apiEndpoints.clear();
    this.metrics.databaseQueries.clear();
  }

  /**
   * Memory profiling
   */
  getMemoryProfile() {
    const memory = process.memoryUsage();
    return {
      heapUsed: {
        bytes: memory.heapUsed,
        mb: (memory.heapUsed / 1024 / 1024).toFixed(2),
        percent: ((memory.heapUsed / memory.heapTotal) * 100).toFixed(2),
      },
      heapTotal: {
        bytes: memory.heapTotal,
        mb: (memory.heapTotal / 1024 / 1024).toFixed(2),
      },
      external: {
        bytes: memory.external,
        mb: (memory.external / 1024 / 1024).toFixed(2),
      },
      rss: {
        bytes: memory.rss,
        mb: (memory.rss / 1024 / 1024).toFixed(2),
      },
      arrayBuffers: {
        bytes: memory.arrayBuffers,
        mb: (memory.arrayBuffers / 1024 / 1024).toFixed(2),
      },
    };
  }
}

// Singleton instance
const performanceOptimizer = new PerformanceOptimizer();

module.exports = {
  performanceOptimizer,
  PerformanceOptimizer,
};
