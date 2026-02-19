/**
 * 🚀 Multi-Level Caching Strategy
 * Multi-level cache system: Memory → Redis → Database
 *
 * Features:
 * - In-memory LRU cache (fast, limited size)
 * - Redis distributed cache (shared, persistent)
 * - Database query results (slow but reliable)
 * - Automatic cache invalidation
 * - Cache warming strategies
 */

const NodeCache = require('node-cache');
const crypto = require('crypto');

/**
 * Multi-Level Cache Manager
 * Implements: Memory Cache → Redis → Database fallback
 */
class MultiLevelCacheManager {
  constructor(redisClient = null) {
    // Level 1: In-Memory LRU Cache
    this.memoryCache = new NodeCache({
      stdTTL: 300, // 5 minutes default
      checkperiod: 60, // Check for expired keys every 60 seconds
      maxKeys: 5000, // Max 5000 keys in memory
    });

    // Level 2: Redis (distributed cache)
    this.redisClient = redisClient;
    this.redisEnabled = !!redisClient;

    // Statistics
    this.stats = {
      memoryHits: 0,
      redisHits: 0,
      misses: 0,
      sets: 0,
      invalidations: 0,
    };

    // Cache warming queue
    this.warmingQueue = [];
    this.isWarming = false;
  }

  /**
   * Generate cache key from parameters
   */
  generateCacheKey(namespace, params) {
    const key = JSON.stringify({ namespace, params });
    return crypto.createHash('md5').update(key).digest('hex');
  }

  /**
   * Get from multi-level cache
   * 1. Try memory cache first
   * 2. Try Redis if available
   * 3. Return null if not found
   */
  async get(namespace, params, ttl = 300) {
    const key = this.generateCacheKey(namespace, params);

    // Level 1: Memory Cache
    const memoryData = this.memoryCache.get(key);
    if (memoryData !== undefined) {
      this.stats.memoryHits++;
      return {
        data: memoryData,
        source: 'memory',
        ttl,
      };
    }

    // Level 2: Redis Cache
    if (this.redisEnabled) {
      try {
        const redisData = await this.redisClient.get(key);
        if (redisData) {
          const parsed = JSON.parse(redisData);
          // Populate memory cache with Redis data
          this.memoryCache.set(key, parsed, ttl);
          this.stats.redisHits++;
          return {
            data: parsed,
            source: 'redis',
            ttl,
          };
        }
      } catch (error) {
        console.error('[Cache] Redis get error:', error.message);
      }
    }

    // Miss
    this.stats.misses++;
    return null;
  }

  /**
   * Set in multi-level cache
   * 1. Set in memory cache immediately
   * 2. Set in Redis if available
   */
  async set(namespace, params, data, ttl = 300) {
    const key = this.generateCacheKey(namespace, params);

    // Level 1: Memory Cache
    this.memoryCache.set(key, data, ttl);

    // Level 2: Redis Cache
    if (this.redisEnabled) {
      try {
        await this.redisClient.setex(key, ttl, JSON.stringify(data));
      } catch (error) {
        console.error('[Cache] Redis set error:', error.message);
      }
    }

    this.stats.sets++;
  }

  /**
   * Invalidate cache by pattern or key
   */
  async invalidate(pattern) {
    // Memory cache invalidation
    const memoryKeys = this.memoryCache.keys();
    const keysToDelete = memoryKeys.filter(k => k.includes(pattern));
    keysToDelete.forEach(k => this.memoryCache.del(k));

    // Redis cache invalidation
    if (this.redisEnabled) {
      try {
        const redisKeys = await this.redisClient.keys(`*${pattern}*`);
        if (redisKeys.length > 0) {
          await this.redisClient.del(...redisKeys);
        }
      } catch (error) {
        console.error('[Cache] Redis invalidate error:', error.message);
      }
    }

    this.stats.invalidations++;
  }

  /**
   * Cache warming: Pre-populate cache with frequently accessed data
   */
  async warmCache(key, dataFn, ttl = 300) {
    this.warmingQueue.push({ key, dataFn, ttl });

    if (!this.isWarming) {
      await this.processWarmingQueue();
    }
  }

  /**
   * Process cache warming queue
   */
  async processWarmingQueue() {
    if (this.isWarming || this.warmingQueue.length === 0) return;

    this.isWarming = true;
    const startTime = Date.now();
    let warmed = 0;

    while (this.warmingQueue.length > 0) {
      const { key, dataFn, ttl } = this.warmingQueue.shift();

      try {
        const data = await dataFn();
        await this.set(key, {}, data, ttl);
        warmed++;
      } catch (error) {
        console.error(`[Cache] Warming failed for ${key}:`, error.message);
      }

      // Avoid blocking
      await new Promise(resolve => setImmediate(resolve));
    }

    this.isWarming = false;
    const duration = Date.now() - startTime;
    console.log(`[Cache] Warmed ${warmed} entries in ${duration}ms`);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.stats.memoryHits + this.stats.redisHits + this.stats.misses;
    const hitRate =
      total > 0 ? (((this.stats.memoryHits + this.stats.redisHits) / total) * 100).toFixed(2) : 0;

    return {
      memoryHits: this.stats.memoryHits,
      redisHits: this.stats.redisHits,
      misses: this.stats.misses,
      sets: this.stats.sets,
      invalidations: this.stats.invalidations,
      hitRate: `${hitRate}%`,
      memorySize: this.memoryCache.keys().length,
      redisEnabled: this.redisEnabled,
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      memoryHits: 0,
      redisHits: 0,
      misses: 0,
      sets: 0,
      invalidations: 0,
    };
  }
}

/**
 * Express middleware for multi-level caching
 */
function multiLevelCacheMiddleware(cacheManager) {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') return next();

    // Skip caching for authenticated requests (unless explicitly allowed)
    if (req.user && !req.cacheMe) return next();

    // Generate cache key from URL
    const cacheKey = {
      namespace: `${req.method}:${req.path}`,
      params: req.query,
    };

    // Try to get from cache
    const cached = await cacheManager.get(cacheKey.namespace, cacheKey.params);
    if (cached) {
      res.set('X-Cache-Source', cached.source);
      res.set('X-Cache-Hit', 'true');
      return res.json(cached.data);
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to cache response
    res.json = function (data) {
      // Cache successful responses only
      if (res.statusCode === 200) {
        cacheManager.set(cacheKey.namespace, cacheKey.params, data, 300);
        res.set('X-Cache-Source', 'generated');
        res.set('X-Cache-Hit', 'false');
      }

      return originalJson(data);
    };

    next();
  };
}

/**
 * Decorator for caching specific functions
 */
function cacheable(namespace, ttl = 300) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args) {
      // Assume cacheManager is available in this context
      if (!this.cacheManager) {
        return originalMethod.apply(this, args);
      }

      const cacheKey = {
        namespace: `${target.constructor.name}:${propertyKey}`,
        params: args[0] || {},
      };

      // Try cache
      const cached = await this.cacheManager.get(cacheKey.namespace, cacheKey.params);
      if (cached) {
        return cached.data;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Cache result
      await this.cacheManager.set(cacheKey.namespace, cacheKey.params, result, ttl);

      return result;
    };

    return descriptor;
  };
}

/**
 * Create middleware function for specific routes
 */
function cacheRoute(namespace, ttl = 300) {
  return async (req, res, next) => {
    const cacheKey = {
      namespace,
      params: req.query,
    };

    // Attach cache function to request
    req.fromCache = async dataFn => {
      const cached = await this.cacheManager.get(cacheKey.namespace, cacheKey.params);
      if (cached) {
        res.set('X-Cache-Hit', 'true');
        return cached.data;
      }

      const data = await dataFn();
      await this.cacheManager.set(cacheKey.namespace, cacheKey.params, data, ttl);
      res.set('X-Cache-Hit', 'false');
      return data;
    };

    next();
  };
}

// Global cache manager instance
let globalCacheManager = null;

/**
 * Initialize global cache manager
 */
function initializeCacheManager(redisClient = null) {
  globalCacheManager = new MultiLevelCacheManager(redisClient);
  return globalCacheManager;
}

/**
 * Get global cache manager
 */
function getCacheManager() {
  if (!globalCacheManager) {
    globalCacheManager = new MultiLevelCacheManager();
  }
  return globalCacheManager;
}

module.exports = {
  MultiLevelCacheManager,
  multiLevelCacheMiddleware,
  cacheable,
  cacheRoute,
  initializeCacheManager,
  getCacheManager,
};
