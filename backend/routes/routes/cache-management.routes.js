/**
 * Cache Management Routes
 * Handles performance optimizer cache statistics and clearing
 * 
 * Endpoints:
 * - GET /api/cache-stats - Get cache statistics
 * - POST /api/cache/clear - Clear cache
 */

const express = require('express');
const router = express.Router();
const { getCacheStats, clearCache } = require('../utils/performance-optimizer');

// Debug middleware to log all requests to this router
router.use((req, res, next) => {
  console.log(`[CACHE-ROUTER] ${req.method} ${req.path} | URL: ${req.originalUrl} | Base URL: ${req.baseUrl}`);
  next();
});

/**
 * @route   GET /cache-stats
 * @desc    Get cache statistics from response cache
 * @access  Public
 */
router.get('/cache-stats', (req, res) => {
  try {
    console.log('[CACHE-STATS] Endpoint hit - returning statistics');
    const stats = getCacheStats();
    console.log('[CACHE-STATS] Stats retrieved:', JSON.stringify(stats));
    res.json({
      success: true,
      caching: stats,
      message: 'Cache statistics retrieved successfully'
    });
  } catch (error) {
    console.error('[CACHE-STATS] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to retrieve cache statistics'
    });
  }
});

/**
 * @route   POST /cache/clear
 * @desc    Clear cache (all or specific path)
 * @access  Public
 */
router.post('/cache/clear', (req, res) => {
  try {
    console.log('[CACHE-CLEAR] Endpoint hit - clearing cache');
    const path = req.body?.path || null;
    clearCache(path);
    
    const stats = getCacheStats();
    console.log('[CACHE-CLEAR] Cache cleared successfully');
    res.json({
      success: true,
      message: path ? `Cache cleared for ${path}` : 'All cache cleared',
      stats: stats
    });
  } catch (error) {
    console.error('[CACHE-CLEAR] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to clear cache'
    });
  }
});

/**
 * @route   GET /cache/health
 * @desc    Health check for cache system
 * @access  Public
 */
router.get('/cache/health', (req, res) => {
  try {
    const stats = getCacheStats();
    const isHealthy = parseInt(stats.entries) >= 0;
    
    res.json({
      success: true,
      status: isHealthy ? 'healthy' : 'degraded',
      cacheStatus: {
        enabled: true,
        entries: stats.entries,
        size: stats.size,
        hitRate: stats.hitRate
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

module.exports = router;
