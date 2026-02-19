/**
 * Advanced Caching System
 * نظام caching متقدم مع استراتيجيات متعددة
 */

const NodeCache = require('node-cache');

class AdvancedCache {
  constructor() {
    // Different cache layers
    this.L1Cache = new NodeCache({ stdTTL: 300 }); // 5 minutes
    this.L2Cache = new NodeCache({ stdTTL: 1800 }); // 30 minutes
    this.L3Cache = new NodeCache({ stdTTL: 3600 }); // 1 hour

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      clears: 0,
    };
  }

  /**
   * Multi-layer get
   */
  get(key) {
    let value = this.L1Cache.get(key);
    if (value) {
      this.stats.hits++;
      return { value, layer: 1, fromCache: true };
    }

    value = this.L2Cache.get(key);
    if (value) {
      this.stats.hits++;
      // Promote to L1
      this.L1Cache.set(key, value);
      return { value, layer: 2, fromCache: true };
    }

    value = this.L3Cache.get(key);
    if (value) {
      this.stats.hits++;
      // Promote to L1
      this.L1Cache.set(key, value);
      return { value, layer: 3, fromCache: true };
    }

    this.stats.misses++;
    return { value: null, fromCache: false };
  }

  /**
   * Multi-layer set
   */
  set(key, value, layer = 1) {
    this.stats.sets++;

    switch (layer) {
      case 1:
        this.L1Cache.set(key, value);
        break;
      case 2:
        this.L2Cache.set(key, value);
        // Also set in L1
        this.L1Cache.set(key, value);
        break;
      case 3:
        this.L3Cache.set(key, value);
        // Also set in L1
        this.L1Cache.set(key, value);
        break;
    }
  }

  /**
   * Pattern-based invalidation
   */
  invalidatePattern(pattern) {
    const regex = new RegExp(pattern);

    [this.L1Cache, this.L2Cache, this.L3Cache].forEach(cache => {
      const keys = cache.keys();
      keys.forEach(key => {
        if (regex.test(key)) {
          cache.del(key);
          this.stats.clears++;
        }
      });
    });
  }

  /**
   * Clear all
   */
  clear() {
    this.L1Cache.flushAll();
    this.L2Cache.flushAll();
    this.L3Cache.flushAll();
    this.stats.clears++;
  }

  /**
   * Get stats
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) + '%' : '0%',
      L1Size: this.L1Cache.keys().length,
      L2Size: this.L2Cache.keys().length,
      L3Size: this.L3Cache.keys().length,
    };
  }

  /**
   * Warm cache with data
   */
  warmCache(data) {
    Object.entries(data).forEach(([key, { value, ttl = 1 }]) => {
      this.set(key, value, ttl);
    });
  }

  /**
   * Get all keys
   */
  getAllKeys() {
    return {
      L1: this.L1Cache.keys(),
      L2: this.L2Cache.keys(),
      L3: this.L3Cache.keys(),
    };
  }
}

// Singleton instance
const cache = new AdvancedCache();

/**
 * Cache middleware
 */
const cacheMiddleware = (options = {}) => {
  const {
    keyGenerator = req => `${req.method}:${req.originalUrl}`,
    ttl = 300,
    layer = 1,
    condition = req => req.method === 'GET',
  } = options;

  return (req, res, next) => {
    // Only cache GET requests by default
    if (!condition(req)) {
      return next();
    }

    const cacheKey = keyGenerator(req);

    // Try to get from cache
    const cached = cache.get(cacheKey);
    if (cached.fromCache) {
      res.set('X-Cache', 'HIT');
      res.set('X-Cache-Layer', `L${cached.layer}`);
      return res.json(cached.value);
    }

    // Wrap original json to cache response
    const originalJson = res.json;
    res.json = function (data) {
      res.set('X-Cache', 'MISS');

      // Cache response
      if (data && typeof data === 'object') {
        cache.set(cacheKey, data, layer);
      }

      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Cache invalidation middleware
 */
const cacheInvalidationMiddleware = (req, res, next) => {
  // For non-GET requests, invalidate relevant caches
  if (req.method !== 'GET') {
    const pattern = `${req.method}:${req.baseUrl || '/'}.*`;
    cache.invalidatePattern(pattern);
  }

  next();
};

module.exports = {
  cache,
  cacheMiddleware,
  cacheInvalidationMiddleware,
  AdvancedCache,
};
