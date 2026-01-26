/**
 * Performance Monitoring Routes
 * مسارات مراقبة الأداء والإحصائيات
 *
 * ✅ GET /api/performance/metrics - معدلات الأداء
 * ✅ GET /api/performance/cache - إحصائيات الـ Cache
 * ✅ POST /api/performance/cache/clear - مسح الـ Cache
 * ✅ GET /api/performance/health - فحص صحة النظام
 */

const express = require('express');
const router = express.Router();
const { performanceMonitor, getCacheStats, clearCache, queryOptimizationHints } = require('../config/performance');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * GET /api/performance/metrics
 * الحصول على معدلات الأداء
 */
router.get('/metrics', authenticate, (req, res) => {
  try {
    const metrics = performanceMonitor.getStats();

    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
      message: 'Performance metrics retrieved successfully',
    });
  } catch (error) {
    logger.error(`خطأ في جلب معدلات الأداء: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/performance/cache
 * إحصائيات الـ Cache
 */
router.get('/cache', authenticate, async (req, res) => {
  try {
    const cacheStats = await getCacheStats();

    res.json({
      success: true,
      data: cacheStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(`خطأ في جلب إحصائيات الـ Cache: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/performance/cache/clear
 * مسح الـ Cache بواسطة نمط
 */
router.post('/cache/clear', authenticate, async (req, res) => {
  try {
    const { pattern } = req.body;
    const cachePattern = pattern || '*';

    const result = await clearCache(cachePattern);

    if (result) {
      logger.info(`تم مسح الـ Cache بالنمط: ${cachePattern}`);
      res.json({
        success: true,
        message: `تم مسح الـ Cache بالنمط: ${cachePattern}`,
        pattern: cachePattern,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'فشل مسح الـ Cache',
      });
    }
  } catch (error) {
    logger.error(`خطأ في مسح الـ Cache: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/performance/query-hints
 * نصائح تحسين الاستعلامات
 */
router.get('/query-hints', authenticate, (req, res) => {
  try {
    res.json({
      success: true,
      data: queryOptimizationHints,
      timestamp: new Date().toISOString(),
      message: 'Database query optimization hints',
    });
  } catch (error) {
    logger.error(`خطأ في جلب نصائح الاستعلامات: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/performance/health
 * فحص صحة النظام
 */
router.get('/health', async (req, res) => {
  try {
    const metrics = performanceMonitor.getStats();
    const cacheStats = await getCacheStats();

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      performance: metrics,
      cache: cacheStats,
      checks: {
        requestHandling: metrics.averageDuration < '1000ms' ? '✅' : '⚠️',
        caching: cacheStats.status === 'connected' ? '✅' : '⚠️',
        slowRequests: metrics.slowRequests === 0 ? '✅' : '⚠️',
      },
    };

    res.json(health);
  } catch (error) {
    logger.error(`خطأ في فحص صحة النظام: ${error.message}`);
    res.status(500).json({
      status: 'unhealthy',
      message: error.message,
    });
  }
});

/**
 * POST /api/performance/metrics/reset
 * إعادة تعيين معدلات الأداء
 */
router.post('/metrics/reset', authenticate, (req, res) => {
  try {
    performanceMonitor.reset();

    logger.info('تم إعادة تعيين معدلات الأداء');

    res.json({
      success: true,
      message: 'Performance metrics reset successfully',
    });
  } catch (error) {
    logger.error(`خطأ في إعادة تعيين المعدلات: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;

