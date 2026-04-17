const express = require('express');
const router = express.Router();
const { authenticate, _authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const logger = require('../utils/logger');
const os = require('os');
const safeError = require('../utils/safeError');

router.use(authenticate);
router.use(requireBranchAccess);
const getSystemMetrics = () => ({
  uptime: process.uptime(),
  memoryUsage: process.memoryUsage(),
  cpuUsage: os.loadavg(),
  freeMemory: os.freemem(),
  totalMemory: os.totalmem(),
  platform: os.platform(),
  nodeVersion: process.version,
});

// GET /dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const metrics = getSystemMetrics();
    const mongoose = require('mongoose');
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({ success: true, data: { ...metrics, database: dbStatus, timestamp: new Date() } });
  } catch (err) {
    safeError(res, err, 'Monitoring dashboard error');
  }
});

// GET /cache
router.get('/cache', async (req, res) => {
  try {
    const AnalyticsCache = require('../models/AnalyticsCache');
    const entries = await AnalyticsCache.find().sort({ updatedAt: -1 }).limit(20).lean();
    res.json({ success: true, data: { entries, totalKeys: entries.length } });
  } catch (err) {
    res.json({ success: true, data: { entries: [], totalKeys: 0, note: 'Cache not available' } });
  }
});

// GET /queries
router.get('/queries', async (req, res) => {
  try {
    res.json({ success: true, data: { slowQueries: [], averageResponseTime: 0 } });
  } catch (err) {
    safeError(res, err, 'Monitoring queries error');
  }
});

// GET /realtime
router.get('/realtime', async (req, res) => {
  try {
    const metrics = getSystemMetrics();
    res.json({
      success: true,
      data: { ...metrics, activeConnections: 0, requestsPerMinute: 0, timestamp: new Date() },
    });
  } catch (err) {
    safeError(res, err, 'Monitoring realtime error');
  }
});

// GET /health
router.get('/health', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const dbOk = mongoose.connection.readyState === 1;
    res.json({
      success: true,
      data: { status: dbOk ? 'healthy' : 'degraded', database: dbOk, uptime: process.uptime() },
    });
  } catch (err) {
    safeError(res, err, 'Monitoring health error');
  }
});

// GET /metrics
router.get('/metrics', async (req, res) => {
  try {
    res.json({ success: true, data: getSystemMetrics() });
  } catch (err) {
    safeError(res, err, 'Monitoring metrics error');
  }
});

// GET /endpoints
router.get('/endpoints', async (req, res) => {
  try {
    res.json({
      success: true,
      data: { totalEndpoints: 0, note: 'Endpoint discovery not implemented' },
    });
  } catch (err) {
    safeError(res, err, 'Monitoring endpoints error');
  }
});

// GET /alerts
router.get('/alerts', async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    const alerts = await Notification.find({ type: { $in: ['alert', 'system'] } })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    res.json({ success: true, data: alerts });
  } catch (err) {
    res.json({ success: true, data: [] });
  }
});

// GET /database
router.get('/database', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    if (!db) return res.json({ success: true, data: { status: 'not connected' } });
    const stats = await db.stats();
    res.json({
      success: true,
      data: {
        collections: stats.collections,
        dataSize: stats.dataSize,
        indexes: stats.indexes,
        storageSize: stats.storageSize,
      },
    });
  } catch (err) {
    logger.error('Monitoring DB stats error:', err);
    res.json({ success: true, data: { status: 'stats unavailable' } });
  }
});

module.exports = router;
