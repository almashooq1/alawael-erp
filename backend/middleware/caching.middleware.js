/**
 * 🎯 Response Caching Middleware - موحدة
 * يحسن الأداء بنسبة 80-90% للطلبات المتكررة
 * @version 2.0.0
 */

const redis = require('redis');

// Create Redis client (singleton)
let redisClient = null;

const getRedisClient = async () => {
  if (!redisClient) {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500)
      }
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis error:', err.message);
      redisClient = null;
    });

    try {
      await redisClient.connect();
      console.log('✅ Redis cache connected');
    } catch (err) {
      console.warn('⚠️ Redis not available, caching disabled:', err.message);
      return null;
    }
  }
  return redisClient;
};

/**
 * Generic cache middleware for GET requests
 * @param {number} ttl - Time to live in seconds (default: 300)
 */
const cacheGET = (ttl = 300) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') return next();

    // Skip caching for admin or special params
    if (req.query.noCache === 'true') return next();

    const client = await getRedisClient();
    if (!client) return next();

    // Generate cache key from path and query params
    const cacheKey = `api:${req.path}:${JSON.stringify(req.query).slice(0, 100)}`;

    try {
      // Try to get from cache
      const cached = await client.get(cacheKey);
      if (cached) {
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-TTL', ttl);
        return res.json(JSON.parse(cached));
      }
    } catch (err) {
      console.warn('Cache read error:', err.message);
    }

    // Override res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      try {
        // Cache successful responses only (status < 400)
        if (res.statusCode < 400) {
          client.setEx(cacheKey, ttl, JSON.stringify(data)).catch(err =>
            console.warn('Cache write error:', err.message)
          );
        }
      } catch (err) {
        console.warn('Cache serialization error:', err.message);
      }
      res.set('X-Cache', 'MISS');
      res.set('X-Cache-TTL', ttl);
      return originalJson(data);
    };

    next();
  };
};

/**
 * Cache specific endpoint
 * @param {string} key - Cache key prefix
 * @param {number} ttl - Time to live in seconds
 */
const cacheSingle = (key, ttl = 600) => {
  return async (req, res, next) => {
    if (req.method !== 'GET') return next();

    const client = await getRedisClient();
    if (!client) return next();

    try {
      const cached = await client.get(key);
      if (cached) {
        res.set('X-Cache', 'HIT');
        return res.json(JSON.parse(cached));
      }
    } catch (err) {
      console.warn('Cache read error:', err.message);
    }

    const originalJson = res.json.bind(res);
    res.json = (data) => {
      try {
        if (res.statusCode < 400) {
          client.setEx(key, ttl, JSON.stringify(data)).catch(err =>
            console.warn('Cache write error:', err.message)
          );
        }
      } catch (err) {
        console.warn('Cache error:', err.message);
      }
      res.set('X-Cache', 'MISS');
      return originalJson(data);
    };

    next();
  };
};

/**
 * Invalidate cache by pattern
 * @param {string} pattern - Pattern to match (e.g., 'api:/departments*')
 */
const invalidateCache = async (pattern) => {
  const client = await getRedisClient();
  if (!client) return;

  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
      console.log(`🗑️  Invalidated ${keys.length} cache entries`);
    }
  } catch (err) {
    console.warn('Cache invalidation error:', err.message);
  }
};

/**
 * Middleware to automatically invalidate related caches
 * Used for POST/PUT/DELETE requests
 */
const invalidateOnMutation = (patterns = []) => {
  return async (req, res, next) => {
    // Only apply to mutation methods
    if (!['POST', 'PUT', 'DELETE'].includes(req.method)) return next();

    const originalJson = res.json.bind(res);
    res.json = async (data) => {
      // Invalidate caches if mutation was successful
      if (res.statusCode < 400 && patterns.length > 0) {
        for (const pattern of patterns) {
          await invalidateCache(pattern);
        }
      }
      return originalJson(data);
    };

    next();
  };
};

/**
 * Get cache statistics
 */
const getCacheStats = async () => {
  const client = await getRedisClient();
  if (!client) return null;

  try {
    const info = await client.info('stats');
    const keys = await client.keys('api:*');
    
    return {
      totalKeys: keys.length,
      memory: info.used_memory_human,
      hits: info.stat_keyspace_hits || 0,
      misses: info.stat_keyspace_misses || 0
    };
  } catch (err) {
    console.warn('Error getting cache stats:', err.message);
    return null;
  }
};

/**
 * Clear all cache
 */
const clearCache = async () => {
  const client = await getRedisClient();
  if (!client) return;

  try {
    const keys = await client.keys('api:*');
    if (keys.length > 0) {
      await client.del(keys);
      console.log(`🗑️  Cleared ${keys.length} cache entries`);
    }
  } catch (err) {
    console.warn('Cache clear error:', err.message);
  }
};

// ============================================
// Export
// ============================================

module.exports = {
  cacheGET,
  cacheSingle,
  invalidateCache,
  invalidateOnMutation,
  getCacheStats,
  clearCache,
  getRedisClient
};
