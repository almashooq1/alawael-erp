/**
 * Performance Optimization Configuration
 * تحسينات الأداء والـ Caching
 *
 * ✅ Redis Caching Strategy
 * ✅ Database Query Optimization
 * ✅ Response Compression
 * ✅ Request/Response Timing
 */

const Redis = require('ioredis');
const compression = require('compression');
const logger = require('../utils/logger');

// Redis Connection
let redis = null;

const initializeRedis = () => {
  // Graceful fallback for demo mode - prevent infinite strict retries
  if (process.env.USE_MOCK_DB === 'true' || process.env.DISABLE_REDIS === 'true') {
    logger.info('ℹ️  Demo/Mock Mode: Redis caching disabled manually.');
    return null;
  }

  try {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      retryStrategy: times => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      enableReadyCheck: false,
      enableOfflineQueue: false,
      maxRetriesPerRequest: null,
    });

    redis.on('connect', () => {
      logger.info('✅ Redis Connected for Caching');
    });

    redis.on('error', err => {
      logger.warn('⚠️  Redis Connection Error:', err.message);
      logger.info('📝 Caching disabled, using in-memory fallback');
    });

    return redis;
  } catch (error) {
    logger.warn('⚠️  Redis initialization failed:', error.message);
    return null;
  }
};

/**
 * Cache Middleware
 * @param {number} ttl - Time to live in seconds
 * @param {string} prefix - Cache key prefix
 */
const cacheMiddleware = (ttl = 300, prefix = 'cache:') => {
  return async (req, res, next) => {
    if (!redis || req.method !== 'GET') {
      // For write operations (POST/PUT/PATCH/DELETE), invalidate related cache
      if (redis && req.method !== 'GET' && req.method !== 'OPTIONS' && req.method !== 'HEAD') {
        // Extract the base API path (e.g., /api/accounting/expenses/:id -> /api/accounting/expenses)
        const basePath = (req.originalUrl || req.url).split('?')[0].replace(/\/[a-f0-9]{24}$/i, '');
        clearCache(`${prefix}${basePath}*`).catch(() => {});
      }
      return next();
    }

    const cacheKey = `${prefix}${req.originalUrl || req.url}`;

    try {
      const cachedData = await redis.get(cacheKey);

      if (cachedData) {
        logger.info(`📦 Cache HIT: ${cacheKey}`);
        if (!res.headersSent) {
          res.set('X-Cache', 'HIT');
        }
        return res.json(JSON.parse(cachedData));
      }

      // Store original res.json
      const originalJson = res.json.bind(res);

      // Override res.json to cache response
      res.json = data => {
        if (res.statusCode === 200) {
          redis.setex(cacheKey, ttl, JSON.stringify(data)).catch(err => {
            logger.warn(`⚠️  Cache SET error for ${cacheKey}:`, err.message);
          });
        }
        if (!res.headersSent) {
          res.set('X-Cache', 'MISS');
        }
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.warn('⚠️  Cache middleware error:', error.message);
      next();
    }
  };
};

/**
 * Clear specific cache pattern.
 * Uses SCAN instead of KEYS to avoid blocking Redis in production.
 */
const clearCache = async (pattern = '*') => {
  if (!redis) return false;

  try {
    let cursor = '0';
    let totalDeleted = 0;

    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;

      if (keys.length > 0) {
        await redis.del(...keys);
        totalDeleted += keys.length;
      }
    } while (cursor !== '0');

    if (totalDeleted > 0) {
      logger.info(`🗑️  Cleared ${totalDeleted} cache entries with pattern: ${pattern}`);
    }
    return true;
  } catch (error) {
    logger.warn('⚠️  Clear cache error:', error.message);
    return false;
  }
};

/**
 * Get cache statistics
 */
const getCacheStats = async () => {
  if (!redis) {
    return {
      status: 'disconnected',
      message: 'Redis not initialized',
    };
  }

  try {
    const info = await redis.info('stats');
    const dbSize = await redis.dbsize();

    return {
      status: 'connected',
      totalKeys: dbSize,
      info: info,
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message,
    };
  }
};

/**
 * Compression Middleware
 */
const compressionMiddleware = compression({
  threshold: 1024, // Only compress responses larger than 1KB
  level: 6, // Compression level (1-9)
});

/**
 * Request Timer Middleware
 */
const requestTimerMiddleware = (req, res, next) => {
  const startTime = Date.now();

  // Override end to set header before it's actually sent
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = Date.now() - startTime;
    if (!res.headersSent) {
      res.set('X-Response-Time', `${duration}ms`);
    }
    return originalEnd.apply(res, args);
  };

  // Log slow requests after finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const route = req.route?.path || req.url;

    // Log slow requests (> 1000ms)
    if (duration > 1000) {
      logger.warn(`⏱️  SLOW REQUEST: ${req.method} ${route} - ${duration}ms`);
    }
  });

  next();
};

/**
 * Database Query Performance Hints
 */
const queryOptimizationHints = {
  Vehicle: {
    indexed_fields: [
      'registrationNumber',
      'plateNumber',
      'owner',
      'assignedDriver',
      'registration.expiryDate',
      'inspection.nextInspectionDate',
      'status',
      'createdAt',
    ],
    recommended_indexes: [
      { field: 'owner_registrationNumber', reason: 'Common filter pair' },
      { field: 'status_createdAt', reason: 'Filtering + sorting' },
      { field: 'tracking.lastLocation.timestamp', reason: 'Location queries' },
    ],
  },
  User: {
    indexed_fields: ['email', 'phone', 'nationalId'],
    recommended_indexes: [
      { field: 'department_createdAt', reason: 'Department-based queries' },
      { field: 'status_email', reason: 'User lookup optimization' },
    ],
  },
};

/**
 * Performance Monitoring
 */
const performanceMonitor = {
  metrics: {
    totalRequests: 0,
    totalDuration: 0,
    slowRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
  },

  recordRequest: (duration, isSlow = false, cacheStatus = null) => {
    performanceMonitor.metrics.totalRequests += 1;
    performanceMonitor.metrics.totalDuration += duration;

    if (isSlow) {
      performanceMonitor.metrics.slowRequests += 1;
    }

    if (cacheStatus === 'HIT') {
      performanceMonitor.metrics.cacheHits += 1;
    } else if (cacheStatus === 'MISS') {
      performanceMonitor.metrics.cacheMisses += 1;
    }
  },

  getStats: () => {
    const avgDuration =
      performanceMonitor.metrics.totalRequests > 0
        ? (
            performanceMonitor.metrics.totalDuration / performanceMonitor.metrics.totalRequests
          ).toFixed(2)
        : 0;

    const cacheHitRate =
      performanceMonitor.metrics.totalRequests > 0
        ? (
            (performanceMonitor.metrics.cacheHits / performanceMonitor.metrics.totalRequests) *
            100
          ).toFixed(2)
        : 0;

    return {
      totalRequests: performanceMonitor.metrics.totalRequests,
      averageDuration: `${avgDuration}ms`,
      slowRequests: performanceMonitor.metrics.slowRequests,
      cacheHits: performanceMonitor.metrics.cacheHits,
      cacheMisses: performanceMonitor.metrics.cacheMisses,
      cacheHitRate: `${cacheHitRate}%`,
    };
  },

  reset: () => {
    performanceMonitor.metrics = {
      totalRequests: 0,
      totalDuration: 0,
      slowRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };
  },
};

module.exports = {
  initializeRedis,
  cacheMiddleware,
  clearCache,
  getCacheStats,
  compressionMiddleware,
  requestTimerMiddleware,
  queryOptimizationHints,
  performanceMonitor,
  /** Returns Redis status string: 'connected' | 'disconnected' | 'disabled' */
  getRedisStatus: () => {
    if (!redis) return 'disabled';
    return redis.status === 'ready' ? 'connected' : redis.status || 'disconnected';
  },
};
