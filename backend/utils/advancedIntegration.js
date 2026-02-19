/**
 * 🔗 Advanced Backend Integration Module
 * Professional System Integration & Enhancement
 * Version: 2.5.0
 */

const express = require('express');
const {
  AdvancedErrorTracker,
  apiVersionMiddleware,
  SmartCacheManager,
  PerformanceMetricsCollector,
  SecurityAuditor,
  QueryOptimizer,
  AdvancedHealthChecker,
} = require('../middleware/advancedEnhancements');

// ============================================================
// INITIALIZE ALL ADVANCED SYSTEMS
// ============================================================

const errorTracker = new AdvancedErrorTracker();
const cacheManager = new SmartCacheManager();
const metricsCollector = new PerformanceMetricsCollector();
const securityAuditor = new SecurityAuditor();
const queryOptimizer = new QueryOptimizer();
const healthChecker = new AdvancedHealthChecker();

// ============================================================
// MIDDLEWARE INTEGRATION
// ============================================================

/**
 * Advanced Request Processing Pipeline
 */
function setupAdvancedMiddleware(app) {
  // 1. API Version Detection
  app.use(apiVersionMiddleware);

  // 2. Security Auditing
  app.use((req, res, next) => {
    const suspiciousActivities = securityAuditor.detectSuspiciousActivity(req);

    if (suspiciousActivities.length > 0) {
      securityAuditor.logSecurityEvent(req, suspiciousActivities[0]);

      if (suspiciousActivities[0].severity === 'critical') {
        securityAuditor.blockIP(req.ip);
        return res.status(403).json({
          success: false,
          error: 'Access denied due to suspicious activity',
        });
      }
    }

    next();
  });

  // 3. Performance Monitoring
  app.use((req, res, next) => {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const metric = metricsCollector.recordRequest(req.method, req.path, duration, res.statusCode);

      // Log slow requests
      if (metric.isCritical) {
        console.warn(`⚠️ Critical performance: ${req.method} ${req.path} took ${duration}ms`);
      }
    });

    next();
  });

  // 4. Smart Caching Layer
  app.use((req, res, next) => {
    if (req.method === 'GET') {
      const cacheKey = `${req.method}:${req.url}`;
      const cached = cacheManager.get(cacheKey);

      if (cached) {
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }

      // Intercept response to cache
      const originalJson = res.json;
      res.json = function (data) {
        cacheManager.set(cacheKey, data, 'moderate');
        res.set('X-Cache', 'MISS');
        return originalJson.call(this, data);
      };
    }

    next();
  });
}

// ============================================================
// ADVANCED API ENDPOINTS
// ============================================================

/**
 * Advanced Monitoring & Diagnostics Routes
 */
function setupAdvancedRoutes(app) {
  const router = express.Router();

  // ============ System Health & Diagnostics ============

  /**
   * Comprehensive System Health Report
   */
  router.get('/api/v2/system/health/comprehensive', async (req, res) => {
    try {
      const health = await healthChecker.runAllChecks();
      const metrics = metricsCollector.getAnalytics();
      const cache = cacheManager.getStats();
      const security = securityAuditor.getSecurityReport();

      res.json({
        success: true,
        data: {
          health,
          metrics,
          cache,
          security,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      const tracked = errorTracker.track(error, { endpoint: '/system/health/comprehensive' });
      res.status(500).json({
        success: false,
        error: error.message,
        trackingId: tracked.id,
      });
    }
  });

  /**
   * Performance Analytics
   */
  router.get('/api/v2/performance/analytics', (req, res) => {
    try {
      const analytics = metricsCollector.getAnalytics();
      const slowestEndpoints = metricsCollector.getSlowestEndpoints();
      const recommendations = queryOptimizer.getOptimizationRecommendations();

      res.json({
        success: true,
        data: {
          analytics,
          slowestEndpoints,
          optimizationRecommendations: recommendations,
        },
      });
    } catch (error) {
      const tracked = errorTracker.track(error, { endpoint: '/performance/analytics' });
      res.status(500).json({
        success: false,
        error: error.message,
        trackingId: tracked.id,
      });
    }
  });

  /**
   * Cache Performance Report
   */
  router.get('/api/v2/cache/performance', (req, res) => {
    try {
      const cacheStats = cacheManager.getStats();

      res.json({
        success: true,
        data: {
          ...cacheStats,
          recommendation:
            cacheStats.hitRate > 80
              ? 'Cache is performing optimally'
              : 'Consider adjusting cache policies',
        },
      });
    } catch (error) {
      const tracked = errorTracker.track(error, { endpoint: '/cache/performance' });
      res.status(500).json({
        success: false,
        error: error.message,
        trackingId: tracked.id,
      });
    }
  });

  /**
   * Security Audit Report
   */
  router.get('/api/v2/security/audit', (req, res) => {
    try {
      const report = securityAuditor.getSecurityReport();

      res.json({
        success: true,
        data: {
          ...report,
          alerts:
            report.criticalCount > 0
              ? 'CRITICAL: Suspicious activity detected'
              : 'No critical alerts',
        },
      });
    } catch (error) {
      const tracked = errorTracker.track(error, { endpoint: '/security/audit' });
      res.status(500).json({
        success: false,
        error: error.message,
        trackingId: tracked.id,
      });
    }
  });

  /**
   * Error Tracking Report
   */
  router.get('/api/v2/errors/report', (req, res) => {
    try {
      const errorStats = errorTracker.getStats();

      res.json({
        success: true,
        data: {
          ...errorStats,
          criticalPercentage: `${((errorStats.critical / errorStats.total) * 100).toFixed(2)}%`,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * System Recommendations
   */
  router.get('/api/v2/system/recommendations', (req, res) => {
    try {
      const recommendations = [];

      // Cache recommendations
      const cacheStats = cacheManager.getStats();
      if (cacheStats.hitRate < 50) {
        recommendations.push({
          priority: 'HIGH',
          category: 'Cache',
          issue: 'Low cache hit rate',
          action: 'Review cache policies and TTL settings',
        });
      }

      // Performance recommendations
      const analytics = metricsCollector.getAnalytics();
      if (analytics.p95 > 1000) {
        recommendations.push({
          priority: 'HIGH',
          category: 'Performance',
          issue: 'P95 response time > 1 second',
          action: 'Optimize slow queries or scale infrastructure',
        });
      }

      // Security recommendations
      const security = securityAuditor.getSecurityReport();
      if (security.blockedIPs.length > 10) {
        recommendations.push({
          priority: 'MEDIUM',
          category: 'Security',
          issue: 'Multiple blocked IPs detected',
          action: 'Review security logs and consider implementing WAF',
        });
      }

      res.json({
        success: true,
        data: {
          recommendations,
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      const tracked = errorTracker.track(error, { endpoint: '/system/recommendations' });
      res.status(500).json({
        success: false,
        error: error.message,
        trackingId: tracked.id,
      });
    }
  });

  // ============ Cache Management ============

  /**
   * Clear Cache
   */
  router.post('/api/v2/cache/clear', (req, res) => {
    try {
      const beforeSize = cacheManager.cache.size;
      cacheManager.clear();

      res.json({
        success: true,
        data: {
          message: 'Cache cleared successfully',
          entriesCleared: beforeSize,
        },
      });
    } catch (error) {
      const tracked = errorTracker.track(error, { endpoint: '/cache/clear' });
      res.status(500).json({
        success: false,
        error: error.message,
        trackingId: tracked.id,
      });
    }
  });

  /**
   * Clear Expired Cache Entries
   */
  router.post('/api/v2/cache/cleanup', (req, res) => {
    try {
      const beforeSize = cacheManager.cache.size;
      cacheManager.clearExpired();
      const afterSize = cacheManager.cache.size;

      res.json({
        success: true,
        data: {
          message: 'Expired cache entries removed',
          removed: beforeSize - afterSize,
          remaining: afterSize,
        },
      });
    } catch (error) {
      const tracked = errorTracker.track(error, { endpoint: '/cache/cleanup' });
      res.status(500).json({
        success: false,
        error: error.message,
        trackingId: tracked.id,
      });
    }
  });

  // ============ Error Management ============

  /**
   * Mark Error as Resolved
   */
  router.post('/api/v2/errors/:errorId/resolve', (req, res) => {
    try {
      errorTracker.markResolved(req.params.errorId);

      res.json({
        success: true,
        data: {
          message: 'Error marked as resolved',
          errorId: req.params.errorId,
        },
      });
    } catch (error) {
      const tracked = errorTracker.track(error, { endpoint: '/errors/:errorId/resolve' });
      res.status(500).json({
        success: false,
        error: error.message,
        trackingId: tracked.id,
      });
    }
  });

  app.use(router);
}

// ============================================================
// HEALTH CHECK REGISTRATION
// ============================================================

function registerHealthChecks() {
  healthChecker.registerCheck('database', async () => {
    const start = Date.now();
    try {
      // Mock database check (replace with actual DB ping)
      await new Promise(resolve => setTimeout(resolve, 10));
      return {
        status: 'healthy',
        responseTime: Date.now() - start + 'ms',
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
      };
    }
  });

  healthChecker.registerCheck('cache', async () => {
    const stats = cacheManager.getStats();
    return {
      status: stats.hitRate > 30 ? 'healthy' : 'degraded',
      hitRate: stats.hitRate,
      size: stats.size,
    };
  });

  healthChecker.registerCheck('memory', async () => {
    const usage = process.memoryUsage();
    const heapUsedPercent = (usage.heapUsed / usage.heapTotal) * 100;

    return {
      status: heapUsedPercent > 90 ? 'warning' : 'healthy',
      heapUsedPercent: heapUsedPercent.toFixed(2) + '%',
      rss: Math.round(usage.rss / 1024 / 1024) + 'MB',
    };
  });

  healthChecker.registerCheck('security', async () => {
    const report = securityAuditor.getSecurityReport();
    return {
      status: report.criticalCount > 0 ? 'warning' : 'healthy',
      criticalEvents: report.criticalCount,
      blockedIPs: report.blockedIPs.length,
    };
  });
}

// ============================================================
// EXPORT FUNCTIONS
// ============================================================

module.exports = {
  setupAdvancedMiddleware,
  setupAdvancedRoutes,
  registerHealthChecks,
  errorTracker,
  cacheManager,
  metricsCollector,
  securityAuditor,
  queryOptimizer,
  healthChecker,
};
