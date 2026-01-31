/**
 * Cache Middleware
 * وسيط الـ Cache لتحسين الأداء
 */

const redisClient = require('../config/redis');

const memoryCache = new Map();
const MEMORY_CACHE_MAX = parseInt(process.env.MEMORY_CACHE_MAX || '500', 10);
const MEMORY_CACHE_TTL = parseInt(process.env.MEMORY_CACHE_TTL || '300', 10); // seconds

// Cache statistics
const cacheStats = {
  hits: 0,
  misses: 0,
  getHitRate() {
    const total = this.hits + this.misses;
    return total > 0 ? (this.hits / total * 100).toFixed(2) : '0.00';
  },
  reset() {
    this.hits = 0;
    this.misses = 0;
  }
};

function getMemoryCache(key) {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data;
}

function setMemoryCache(key, data, ttlSeconds) {
  if (memoryCache.size >= MEMORY_CACHE_MAX) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) memoryCache.delete(oldestKey);
  }
  memoryCache.set(key, {
    data,
    expires: Date.now() + ttlSeconds * 1000,
  });
}

function clearMemoryByPattern(pattern) {
  if (!pattern) return 0;
  const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
  let deleted = 0;
  for (const key of memoryCache.keys()) {
    if (regex.test(key)) {
      memoryCache.delete(key);
      deleted += 1;
    }
  }
  return deleted;
}

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

    const useRedis = redisClient.isEnabled() && redisClient.isConnected();

    try {
      // Generate cache key
      const cacheKey = keyGenerator ? keyGenerator(req) : `cache:${req.originalUrl}`;

      // Try to get from cache
      const cachedData = useRedis ? await redisClient.get(cacheKey) : getMemoryCache(cacheKey);

      if (cachedData) {
        cacheStats.hits++;
        console.log(`✅ Cache HIT: ${cacheKey} (Rate: ${cacheStats.getHitRate()}%)`);

        // Add cache header
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        res.set('X-Cache-Store', useRedis ? 'REDIS' : 'MEMORY');
        res.set('X-Cache-Hit-Rate', cacheStats.getHitRate());

        return res.json(cachedData);
      }

      cacheStats.misses++;
      console.log(`❌ Cache MISS: ${cacheKey} (Rate: ${cacheStats.getHitRate()}%)`);

      // Store original res.json
      const originalJson = res.json.bind(res);

      // Override res.json to cache the response
      res.json = function (data) {
        if (useRedis) {
          redisClient
            .set(cacheKey, data, ttl)
            .then(() => {
              console.log(`💾 Cached: ${cacheKey} (TTL: ${ttl}s)`);
            })
            .catch(err => {
              console.error(`Cache SET error: ${err.message}`);
            });
        } else {
          const ttlSeconds = ttl || MEMORY_CACHE_TTL;
          setMemoryCache(cacheKey, data, ttlSeconds);
        }

        // Add cache header
        res.set('X-Cache', 'MISS');
        res.set('X-Cache-Key', cacheKey);
        res.set('X-Cache-Store', useRedis ? 'REDIS' : 'MEMORY');

        // Call original json
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error.message);
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
    const useRedis = redisClient.isEnabled() && redisClient.isConnected();

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
          if (useRedis) {
            const deleted = await redisClient.delPattern(pattern);
            if (deleted > 0) {
              console.log(`🗑️  Invalidated ${deleted} cache keys: ${pattern}`);
            }
          } else {
            const deleted = clearMemoryByPattern(pattern);
            if (deleted > 0) {
              console.log(`🗑️  Invalidated ${deleted} memory keys: ${pattern}`);
            }
          }
        }
      } catch (error) {
        console.error('Cache invalidation error:', error.message);
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
  getCacheStats: () => cacheStats,
  resetCacheStats: () => cacheStats.reset(),
};
