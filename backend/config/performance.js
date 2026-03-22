/**
 * Performance Optimization Configuration
 * تحسينات الأداء والـ Caching
 *
 * ✅ Redis Caching Strategy with Connection Pooling
 * ✅ Database Query Optimization
 * ✅ Response Compression with Brotli support
 * ✅ Request/Response Timing with P95/P99 tracking
 * ✅ ETag Support for conditional responses
 * ✅ Memory pressure monitoring
 * ✅ Circuit breaker for Redis failures
 */

const Redis = require('ioredis');
const compression = require('compression');
const crypto = require('crypto');
const logger = require('../utils/logger');

// Redis Connection
let redis = null;

// Circuit breaker state for Redis
const circuitBreaker = {
  failures: 0,
  maxFailures: 5,
  resetTimeout: 30000, // 30s
  lastFailure: null,
  isOpen: false,
};

const checkCircuitBreaker = () => {
  if (!circuitBreaker.isOpen) return false;
  if (Date.now() - circuitBreaker.lastFailure > circuitBreaker.resetTimeout) {
    circuitBreaker.isOpen = false;
    circuitBreaker.failures = 0;
    logger.info('Redis circuit breaker reset — attempting reconnection');
    return false;
  }
  return true;
};

const recordRedisFailure = () => {
  circuitBreaker.failures++;
  circuitBreaker.lastFailure = Date.now();
  if (circuitBreaker.failures >= circuitBreaker.maxFailures) {
    circuitBreaker.isOpen = true;
    logger.warn(`Redis circuit breaker OPEN after ${circuitBreaker.failures} failures`);
  }
};

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
      db: parseInt(process.env.REDIS_DB, 10) || 0,
      retryStrategy: times => {
        if (times > 10) return null; // Stop retrying after 10 attempts
        const delay = Math.min(times * 100, 3000);
        return delay;
      },
      enableReadyCheck: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 3,
      lazyConnect: false,
      connectTimeout: 10000,
      commandTimeout: 5000,
      keepAlive: 30000,
    });

    redis.on('connect', () => {
      circuitBreaker.failures = 0;
      circuitBreaker.isOpen = false;
      logger.info('✅ Redis Connected for Caching');
    });

    redis.on('error', err => {
      recordRedisFailure();
      logger.warn('⚠️  Redis Connection Error:', err.message);
    });

    redis.on('close', () => {
      logger.info('Redis connection closed');
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
 * Compression Middleware — adaptive compression based on content type
 */
const compressionMiddleware = compression({
  threshold: 512, // Compress responses larger than 512 bytes
  level: 6, // Compression level (1-9)
  filter: (req, res) => {
    // Don't compress server-sent events
    if (req.headers['accept'] === 'text/event-stream') return false;
    // Don't compress already-compressed formats

    if (/\.(gz|br|zip|png|jpg|jpeg|gif|webp|mp4|webm)$/i.test(req.url)) return false;
    return compression.filter(req, res);
  },
  // Prefer JSON and text APIs for compression
  memLevel: 8,
});

/**
 * Request Timer Middleware — with percentile tracking
 */
const responseTimeBuckets = [];
const MAX_BUCKETS = 10000;

const requestTimerMiddleware = (req, res, next) => {
  const startHr = process.hrtime.bigint();

  // Override end to set header before it's actually sent
  const originalEnd = res.end;
  res.end = function (...args) {
    const durationNs = Number(process.hrtime.bigint() - startHr);
    const durationMs = (durationNs / 1e6).toFixed(2);
    if (!res.headersSent) {
      res.set('X-Response-Time', `${durationMs}ms`);
    }
    return originalEnd.apply(res, args);
  };

  // Log slow requests after finish
  res.on('finish', () => {
    const durationNs = Number(process.hrtime.bigint() - startHr);
    const durationMs = durationNs / 1e6;
    const route = req.route?.path || req.url;

    // Track for percentile computation
    if (responseTimeBuckets.length >= MAX_BUCKETS) responseTimeBuckets.shift();
    responseTimeBuckets.push(durationMs);

    // Log slow requests (> 800ms)
    if (durationMs > 800) {
      logger.warn(`⏱️  SLOW REQUEST: ${req.method} ${route} - ${durationMs.toFixed(0)}ms`, {
        statusCode: res.statusCode,
        contentLength: res.getHeader('content-length'),
      });
    }
  });

  next();
};

/**
 * ETag middleware for conditional GET responses
 */
const etagMiddleware = (req, res, next) => {
  if (req.method !== 'GET') return next();

  const originalJson = res.json.bind(res);
  res.json = data => {
    if (res.statusCode === 200 && data) {
      const body = JSON.stringify(data);
      const hash = crypto.createHash('md5').update(body).digest('hex');
      const etag = `"${hash}"`;

      res.set('ETag', etag);

      if (req.headers['if-none-match'] === etag) {
        return res.status(304).end();
      }

      return originalJson(data);
    }
    return originalJson(data);
  };
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

/**
 * Get response time percentiles
 */
const getResponseTimePercentiles = () => {
  if (responseTimeBuckets.length === 0) return { p50: 0, p90: 0, p95: 0, p99: 0 };
  const sorted = [...responseTimeBuckets].sort((a, b) => a - b);
  const p = pct => sorted[Math.floor((sorted.length * pct) / 100)] || 0;
  return {
    p50: Math.round(p(50)),
    p90: Math.round(p(90)),
    p95: Math.round(p(95)),
    p99: Math.round(p(99)),
    samples: sorted.length,
  };
};

/**
 * Memory pressure monitor — warns when heap usage is high
 */
const getMemoryPressure = () => {
  const mem = process.memoryUsage();
  const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
  const rssMB = Math.round(mem.rss / 1024 / 1024);
  const heapUsagePercent = Math.round((mem.heapUsed / mem.heapTotal) * 100);

  let status = 'normal';
  if (heapUsagePercent > 90) status = 'critical';
  else if (heapUsagePercent > 75) status = 'high';
  else if (heapUsagePercent > 60) status = 'elevated';

  return { heapUsedMB, heapTotalMB, rssMB, heapUsagePercent, status };
};

module.exports = {
  initializeRedis,
  cacheMiddleware,
  clearCache,
  getCacheStats,
  compressionMiddleware,
  requestTimerMiddleware,
  etagMiddleware,
  queryOptimizationHints,
  performanceMonitor,
  getResponseTimePercentiles,
  getMemoryPressure,
  /** Returns Redis status string: 'connected' | 'disconnected' | 'disabled' */
  getRedisStatus: () => {
    if (!redis) return 'disabled';
    if (checkCircuitBreaker()) return 'circuit-open';
    return redis.status === 'ready' ? 'connected' : redis.status || 'disconnected';
  },
};
