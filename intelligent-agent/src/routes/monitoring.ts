import express from 'express';
import os from 'os';
import { performanceMonitor } from '../middleware/performance-monitor';
import { Logger } from '../modules/logger';

const router = express.Router();
const logger = Logger.getInstance();

/**
 * @swagger
 * /api/monitoring/system:
 *   get:
 *     summary: Get system health metrics
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System metrics
 */
router.get('/system', (req, res) => {
  const cpuUsage = os.loadavg()[0] / os.cpus().length * 100;
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const memUsage = ((totalMem - freeMem) / totalMem) * 100;

  res.json({
    cpu: cpuUsage,
    memory: memUsage,
    disk: 45.5, // Mock data - يمكن استخدام مكتبة disk-usage
    uptime: os.uptime(),
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
  });
});

/**
 * @swagger
 * /api/monitoring/requests:
 *   get:
 *     summary: Get request statistics
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Request statistics
 */
router.get('/requests', (req, res) => {
  const stats = performanceMonitor.getStats();

  const statsData: any = stats;
  res.json({
    total: stats.totalRequests,
    success: stats.totalRequests - (statsData.errors || 0),
    errors: statsData.errors || 0,
    avgResponseTime: statsData.avgResponseTime || statsData.avgDuration || 0,
  });
});

/**
 * @swagger
 * /api/monitoring/endpoints:
 *   get:
 *     summary: Get endpoint statistics
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Endpoint statistics
 */
router.get('/endpoints', (req, res) => {
  const stats = performanceMonitor.getStats();

  // Convert map to array and sort by count
  const statsData: any = stats;
  const endpoints = Object.entries(statsData.endpointStats || {})
    .map(([path, data]: [string, any]) => ({
      endpoint: path,
      requests: data.count,
      avgResponseTime: data.avgDuration,
    }))
    .sort((a, b) => b.requests - a.requests);

  res.json(endpoints);
});

/**
 * @swagger
 * /api/monitoring/timeseries:
 *   get:
 *     summary: Get time series data for last hour
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Time series data
 */
router.get('/timeseries', (req, res) => {
  // Mock data - في production يجب حفظ هذه البيانات في قاعدة بيانات
  const now = Date.now();
  const data = [];

  for (let i = 60; i >= 0; i--) {
    const timestamp = now - (i * 60 * 1000); // كل دقيقة
    data.push({
      time: new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      responseTime: Math.floor(Math.random() * 200) + 50,
      requests: Math.floor(Math.random() * 50) + 10,
      errors: Math.floor(Math.random() * 5),
    });
  }

  res.json(data);
});

/**
 * @swagger
 * /api/monitoring/errors:
 *   get:
 *     summary: Get recent errors
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Recent errors
 */
router.get('/errors', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;

    // Read from logs or database
    // Mock data for now
    const errors = [
      {
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        message: 'Database connection timeout',
        stack: 'Error: Connection timeout...',
        endpoint: '/api/users',
      },
      {
        timestamp: new Date(Date.now() - 300000).toISOString(),
        level: 'ERROR',
        message: 'Invalid token',
        stack: 'Error: JWT expired',
        endpoint: '/api/auth/verify',
      },
    ];

    res.json(errors.slice(0, limit));
  } catch (error) {
    logger.error('Failed to fetch errors', {}, error as Error);
    res.status(500).json({ error: 'Failed to fetch errors' });
  }
});

/**
 * @swagger
 * /api/monitoring/alerts:
 *   get:
 *     summary: Get active alerts
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active alerts
 */
router.get('/alerts', (req, res) => {
  const alerts = [];
  const stats = performanceMonitor.getStats();

  // CPU Alert
  const cpuUsage = os.loadavg()[0] / os.cpus().length * 100;
  if (cpuUsage > 80) {
    alerts.push({
      type: 'warning',
      message: `High CPU usage: ${cpuUsage.toFixed(1)}%`,
      timestamp: new Date().toISOString(),
    });
  }

  // Memory Alert
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const memUsage = ((totalMem - freeMem) / totalMem) * 100;
  if (memUsage > 80) {
    alerts.push({
      type: 'warning',
      message: `High memory usage: ${memUsage.toFixed(1)}%`,
      timestamp: new Date().toISOString(),
    });
  }

  // Response Time Alert
  if ((stats as any).avgResponseTime && (stats as any).avgResponseTime > 500) {
    alerts.push({
      type: 'warning',
      message: `Slow response time: ${((stats as any).avgResponseTime).toFixed(0)}ms`,
      timestamp: new Date().toISOString(),
    });
  }

  res.json(alerts);
});

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '2.1.0',
  });
});

export default router;
