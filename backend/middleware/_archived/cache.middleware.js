/* eslint-disable no-unused-vars */
/**
 * Cache Middleware
 * وسيط الـ Cache لتحسين الأداء
 */

const redisClient = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Cache middleware for GET requests
 * وسيط الـ Cache لطلبات GET
 *
 * @param {number} ttl - Time to live in seconds (default: 3600)
 * @param {function} keyGenerator - Function to generate cache key (default: req.originalUrl)
 */
function cacheMiddleware(ttl = 3600, keyGenerator = null) {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip if Redis not enabled or not connected
    if (!redisClient.isEnabled() || !redisClient.isConnected()) {
      return next();
    }

    try {
      // Generate cache key
      const cacheKey = keyGenerator ? keyGenerator(req) : `cache:${req.originalUrl}`;

      // Try to get from cache
      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        // console.log(`✅ Cache HIT: ${cacheKey}`);

        // Add cache header
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);

        return res.json(cachedData);
      }

      // console.log(`❌ Cache MISS: ${cacheKey}`);

      // Store original res.json
      const originalJson = res.json.bind(res);

      // Override res.json to cache the response
      res.json = function (data) {
        // Cache the response
        redisClient
          .set(cacheKey, data, ttl)
          .then(() => {
            // console.log(`💾 Cached: ${cacheKey} (TTL: ${ttl}s)`);
          })
          .catch(err => {
            logger.error('Cache SET error:', { error: err.message });
          });

        // Add cache header
        res.set('X-Cache', 'MISS');
        res.set('X-Cache-Key', cacheKey);

        // Call original json
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', { error: error.message });
      next();
    }
  };
}

/**
 * Cache invalidation middleware
 * وسيط إلغاء الـ Cache
 *
 * @param {string|string[]|function} patterns - Cache key patterns to invalidate
 */
function invalidateCache(patterns) {
  return async (req, res, next) => {
    // Skip if Redis not enabled or not connected
    if (!redisClient.isEnabled() || !redisClient.isConnected()) {
      return next();
    }

    // Store original res.json
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    // Function to invalidate cache
    const invalidate = async () => {
      try {
        let patternsToDelete = [];

        if (typeof patterns === 'function') {
          patternsToDelete = patterns(req);
        } else if (Array.isArray(patterns)) {
          patternsToDelete = patterns;
        } else {
          patternsToDelete = [patterns];
        }

        // Invalidate each pattern
        for (const pattern of patternsToDelete) {
          const deleted = await redisClient.delPattern(pattern);
          if (deleted > 0) {
            // console.log(`🗑️  Invalidated ${deleted} cache keys: ${pattern}`);
          }
        }
      } catch (error) {
        logger.error('Cache invalidation error:', { error: error.message });
      }
    };

    // Override res.json
    res.json = function (data) {
      invalidate();
      return originalJson(data);
    };

    // Override res.send
    res.send = function (data) {
      invalidate();
      return originalSend(data);
    };

    next();
  };
}

/**
 * Create cache key generator for user-specific data
 * إنشاء مولد مفتاح cache لبيانات المستخدم
 */
function userCacheKey(prefix) {
  return req => {
    const userId = req.user?.id || 'anonymous';
    return `cache:${prefix}:user:${userId}:${req.originalUrl}`;
  };
}

/**
 * Create cache key generator for module-specific data
 * إنشاء مولد مفتاح cache لبيانات الوحدة
 */
function moduleCacheKey(moduleKey) {
  return req => {
    return `cache:module:${moduleKey}:${req.originalUrl}`;
  };
}

module.exports = {
  cacheMiddleware,
  invalidateCache,
  userCacheKey,
  moduleCacheKey,
};
