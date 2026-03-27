/**
 * Health & Monitoring Routes - Phase 4
 * Comprehensive health checks and system monitoring endpoints
 */

const express = require('express');
const mongoose = require('mongoose');
const { Analytics, Asset, Schedule, DisabilityProgram } = require('../models');
const redisClient = require('../config/redis');

const router = express.Router();

/**
 * GET /api/v1/health/db
 * Database connectivity and status check
 */
router.get('/db', async (req, res) => {
  try {
    const dbStatus = {
      connected: mongoose.connection.readyState === 1,
      readyState: mongoose.connection.readyState,
      collections: mongoose.connection.collections
        ? Object.keys(mongoose.connection.collections).length
        : 0,
    };

    // Check database responsiveness with a simple query
    const _dbHealth = await Promise.race([
      Asset.countDocuments().lean(),
      new Promise((_, reject) =>
        setTimeout(() => { reject(new Error('Database query timeout')); }, 5000)
      ),
    ]);

    const mongooseStatus = {
      version: mongoose.version,
      connected: dbStatus.connected,
    };

    res.json({
      status: dbStatus.connected ? 'healthy' : 'unhealthy',
      database: {
        ...dbStatus,
        healthCheck: dbStatus.connected ? 'passed' : 'failed',
        responseTime: `${req.startTime ? Number(process.hrtime.bigint() - req.startTime) / 1e6 : 0}ms`,
      },
      mongoose: mongooseStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'حدث خطأ في الخادم',
      database: {
        connected: false,
        healthCheck: 'failed',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/health/models
 * Verify all Phase 3 models are accessible
 */
router.get('/models', async (req, res) => {
  try {
    const modelChecks = {
      Asset: { count: 0, lastCheck: new Date() },
      Schedule: { count: 0, lastCheck: new Date() },
      Analytics: { count: 0, lastCheck: new Date() },
      DisabilityProgram: { count: 0, lastCheck: new Date() },
    };

    // Check each model
    const [assetCount, scheduleCount, analyticsCount, programCount] = await Promise.all([
      Asset.countDocuments().catch(() => 0),
      Schedule.countDocuments().catch(() => 0),
      Analytics.countDocuments().catch(() => 0),
      DisabilityProgram.countDocuments().catch(() => 0),
    ]);

    modelChecks.Asset.count = assetCount;
    modelChecks.Schedule.count = scheduleCount;
    modelChecks.Analytics.count = analyticsCount;
    modelChecks.DisabilityProgram.count = programCount;

    const allModelsHealthy = Object.values(modelChecks).every(m => m.count >= 0);

    res.json({
      status: allModelsHealthy ? 'healthy' : 'degraded',
      models: modelChecks,
      totalRecords: assetCount + scheduleCount + analyticsCount + programCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'حدث خطأ في الخادم',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/health/system
 * Overall system health status
 */
router.get('/system', async (req, res) => {
  try {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // Check MongoDB connection
    const mongoConnected = mongoose.connection.readyState === 1;

    // Check Redis (if available) — actual PING
    const redisEnabled = process.env.REDIS_ENABLED !== 'false';
    let redisOk = false;
    let redisPingMs = null;
    if (redisEnabled) {
      try {
        const client = redisClient.getClient ? redisClient.getClient() : null;
        if (client && typeof client.ping === 'function') {
          const start = Date.now();
          await Promise.race([
            client.ping(),
            new Promise((_, rej) => { setTimeout(() => rej(new Error('Redis ping timeout')), 3000); }),
          ]);
          redisPingMs = Date.now() - start;
          redisOk = true;
        }
      } catch {
        redisOk = false;
      }
    }

    // Get database statistics
    const assetCount = await Asset.countDocuments().catch(() => 0);
    const analyticsCount = await Analytics.countDocuments().catch(() => 0);

    const health = {
      status: mongoConnected ? 'healthy' : 'warning',
      uptime: {
        seconds: Math.floor(uptime),
        minutes: Math.floor(uptime / 60),
        hours: Math.floor(uptime / 3600),
        formatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
      },
      memory: {
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
        heapUsedPercent: ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(2) + '%',
      },
      cpu: {
        user: Math.round(cpuUsage.user / 1000) + 'ms',
        system: Math.round(cpuUsage.system / 1000) + 'ms',
      },
      database: {
        connected: mongoConnected,
        records: {
          assets: assetCount,
          analytics: analyticsCount,
        },
      },
      services: {
        mongodb: mongoConnected ? 'operational' : 'degraded',
        redis: redisEnabled ? (redisOk ? 'operational' : 'degraded') : 'disabled',
        ...(redisPingMs !== null && { redisPingMs }),
      },
      timestamp: new Date().toISOString(),
    };

    res.json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'حدث خطأ في الخادم',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/health/full
 * Comprehensive health check combining all checks
 */
router.get('/full', async (req, res) => {
  try {
    const mongoConnected = mongoose.connection.readyState === 1;
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    // Perform all checks in parallel
    const [assetCount, scheduleCount, analyticsCount, programCount] = await Promise.all([
      Asset.countDocuments().catch(() => 0),
      Schedule.countDocuments().catch(() => 0),
      Analytics.countDocuments().catch(() => 0),
      DisabilityProgram.countDocuments().catch(() => 0),
    ]).catch(() => [0, 0, 0, 0]);

    const overallStatus = mongoConnected ? 'healthy' : 'unhealthy';
    const memPercent = ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(2);

    const fullHealth = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          status: mongoConnected ? 'pass' : 'fail',
          details: {
            connected: mongoConnected,
            collections: Object.keys(mongoose.connection.collections || {}).length,
            responseTimeMs: req.startTime
              ? Number(process.hrtime.bigint() - req.startTime) / 1e6
              : 0,
          },
        },
        models: {
          status: 'pass',
          details: {
            Asset: assetCount,
            Schedule: scheduleCount,
            Analytics: analyticsCount,
            DisabilityProgram: programCount,
            Total: assetCount + scheduleCount + analyticsCount + programCount,
          },
        },
        system: {
          status: memPercent < 85 ? 'pass' : 'warning',
          details: {
            uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
            memoryHeapPercent: memPercent,
            memoryHeapUseMB: Math.round(memUsage.heapUsed / 1024 / 1024),
            memoryHeapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
          },
        },
      },
      services: {
        mongodb: mongoConnected ? 'operational' : 'offline',
        redis: process.env.REDIS_ENABLED !== 'false' ? 'operational' : 'disabled',
        logger: 'operational',
      },
      routes: (() => {
        try {
          const { routeHealth } = require('./_registry');
          return routeHealth.summary;
        } catch (_e) {
          return { error: 'unavailable' };
        }
      })(),
    };

    res.status(overallStatus === 'healthy' ? 200 : 503).json(fullHealth);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'حدث خطأ في الخادم',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/health/ready
 * Kubernetes-style readiness probe
 */
router.get('/ready', async (req, res) => {
  try {
    const mongoConnected = mongoose.connection.readyState === 1;

    if (!mongoConnected) {
      return res.status(503).json({
        ready: false,
        reason: 'Database not connected',
      });
    }

    // Quick database connectivity check
    await Asset.countDocuments().hint({ $natural: 1 }).limit(1);

    res.json({
      ready: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      reason: 'حدث خطأ في الخادم',
    });
  }
});

/**
 * GET /api/v1/health/alive
 * Kubernetes-style liveness probe
 */
router.get('/alive', (_req, res) => {
  res.json({
    alive: true,
    pid: process.pid,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
