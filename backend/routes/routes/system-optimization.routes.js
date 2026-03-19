/**
 * System Optimization Routes
 * APIs for monitoring, testing, and optimizing system performance
 */

const express = require('express');
const router = express.Router();

// Performance metrics tracking
const metricsCollector = {
  requests: [],
  responses: [],
  dbQueries: [],
  memorySnapshots: [],

  recordRequest(path, method) {
    this.requests.push({
      timestamp: Date.now(),
      path,
      method,
    });
    // Keep only last 1000 requests
    if (this.requests.length > 1000) {
      this.requests.shift();
    }
  },

  recordResponse(statusCode, duration) {
    this.responses.push({
      timestamp: Date.now(),
      statusCode,
      duration,
    });
    if (this.responses.length > 1000) {
      this.responses.shift();
    }
  },

  getMetrics() {
    const now = Date.now();
    const last60s = (element) => now - element.timestamp < 60000;

    const recentRequests = this.requests.filter(last60s);
    const recentResponses = this.responses.filter(last60s);

    // Calculate averages
    const avgResponseTime =
      recentResponses.length > 0
        ? recentResponses.reduce((sum, r) => sum + r.duration, 0) / recentResponses.length
        : 0;

    const errorRate =
      recentResponses.length > 0
        ? (recentResponses.filter((r) => r.statusCode >= 400).length / recentResponses.length) * 100
        : 0;

    return {
      requestsPerMinute: recentRequests.length,
      responsesPerMinute: recentResponses.length,
      avgResponseTime: Math.round(avgResponseTime),
      errorRate: Math.round(errorRate * 100) / 100,
      totalRequests: this.requests.length,
    };
  },
};

// Middleware to collect metrics
const metricsMiddleware = (req, res, next) => {
  const startTime = Date.now();

  metricsCollector.recordRequest(req.path, req.method);

  // Override res.json to track response time
  const originalJson = res.json;
  res.json = function (data) {
    const duration = Date.now() - startTime;
    metricsCollector.recordResponse(res.statusCode || 200, duration);
    return originalJson.call(this, data);
  };

  next();
};

router.use(metricsMiddleware);

/**
 * GET /api/system/metrics
 * Get system performance metrics
 */
router.get('/metrics', (req, res) => {
  const metrics = metricsCollector.getMetrics();
  const memUsage = process.memoryUsage();

  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    performance: metrics,
    memory: {
      heapUsed: Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100,
      heapTotal: Math.round((memUsage.heapTotal / 1024 / 1024) * 100) / 100,
      external: Math.round((memUsage.external / 1024 / 1024) * 100) / 100,
      rss: Math.round((memUsage.rss / 1024 / 1024) * 100) / 100,
    },
    uptime: Math.round(process.uptime()),
  });
});

/**
 * POST /api/system/optimize
 * Run optimization tasks
 */
router.post('/optimize', async (req, res) => {
  try {
    const optimization = {
      timestamp: new Date().toISOString(),
      tasks: [],
    };

    // Task 1: Clear old logs
    optimization.tasks.push({
      name: 'Clear old request logs',
      status: 'completed',
      itemsCleared: metricsCollector.requests.length > 500 ? metricsCollector.requests.splice(0, 500).length : 0,
    });

    // Task 2: Garbage collection (if available)
    if (global.gc) {
      global.gc();
      optimization.tasks.push({
        name: 'Garbage collection',
        status: 'completed',
      });
    }

    // Task 3: Database connection check
    try {
      const mongooseConnection = require('mongoose').connection;
      optimization.tasks.push({
        name: 'Database connection status',
        status: mongooseConnection.readyState === 1 ? 'healthy' : 'degraded',
        readyState: mongooseConnection.readyState,
      });
    } catch (error) {
      optimization.tasks.push({
        name: 'Database connection status',
        status: 'error',
        error: error.message,
      });
    }

    res.json({
      success: true,
      optimization,
      message: 'System optimization completed',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/system/health
 * Comprehensive system health check
 */
router.get('/health', (req, res) => {
  const memUsage = process.memoryUsage();
  const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      memory: {
        status: heapUsedPercent < 80 ? 'healthy' : heapUsedPercent < 95 ? 'warning' : 'critical',
        heapUsedPercent: Math.round(heapUsedPercent * 100) / 100,
        heapUsedMB: Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100,
      },
      performance: {
        status: metricsCollector.getMetrics().errorRate < 5 ? 'healthy' : 'warning',
        ...metricsCollector.getMetrics(),
      },
      process: {
        status: 'healthy',
        pid: process.pid,
        cpuUsage: process.cpuUsage(),
      },
    },
  };

  // Determine overall status
  const allChecks = Object.values(health.checks);
  if (allChecks.some((check) => check.status === 'critical')) {
    health.status = 'critical';
  } else if (allChecks.some((check) => check.status === 'warning')) {
    health.status = 'warning';
  }

  const statusCode = health.status === 'healthy' ? 200 : health.status === 'warning' ? 202 : 503;
  res.status(statusCode).json(health);
});

/**
 * GET /api/system/stats
 * Full system statistics
 */
router.get('/stats', (req, res) => {
  const memUsage = process.memoryUsage();

  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    server: {
      uptime: Math.round(process.uptime()),
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    memory: {
      heapUsedMB: Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100,
      heapTotalMB: Math.round((memUsage.heapTotal / 1024 / 1024) * 100) / 100,
      externalMB: Math.round((memUsage.external / 1024 / 1024) * 100) / 100,
      rssMB: Math.round((memUsage.rss / 1024 / 1024) * 100) / 100,
      heapUsedPercent: Math.round(((memUsage.heapUsed / memUsage.heapTotal) * 100 * 100)) / 100,
    },
    performance: metricsCollector.getMetrics(),
  });
});

/**
 * GET /api/system/routes
 * List all registered routes
 */
router.get('/routes', (req, res) => {
  const routes = [];

  // Extract routes from app
  try {
    const app = req.app;

    app._router.stack.forEach((middleware) => {
      if (middleware.route) {
        const methods = Object.keys(middleware.route.methods).map((m) => m.toUpperCase());
        routes.push({
          path: middleware.route.path,
          methods,
        });
      } else if (middleware.name === 'router' && middleware.handle._router) {
        middleware.handle._router.stack.forEach((handler) => {
          if (handler.route) {
            const methods = Object.keys(handler.route.methods).map((m) => m.toUpperCase());
            routes.push({
              path: middleware.regexp.source
                .replace(/\\/, '')
                .replace('/?(?=/', '')
                .replace('$', '') + handler.route.path,
              methods,
            });
          }
        });
      }
    });
  } catch (error) {
    console.error('Error extracting routes:', error);
  }

  res.json({
    success: true,
    totalRoutes: routes.length,
    routes: routes.slice(0, 50), // Limit to first 50
  });
});

/**
 * POST /api/system/reset-metrics
 * Reset performance metrics
 */
router.post('/reset-metrics', (req, res) => {
  metricsCollector.requests = [];
  metricsCollector.responses = [];
  metricsCollector.dbQueries = [];

  res.json({
    success: true,
    message: 'Metrics reset successfully',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
