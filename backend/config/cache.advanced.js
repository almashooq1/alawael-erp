/**
 * Advanced Caching Strategy - استراتيجية التخزين المؤقت المتقدمة
 *
 * الميزات:
 * ✅ Multi-Level Caching (Memory + Redis)
 * ✅ Cache Invalidation Strategy
 * ✅ Cache Warming
 * ✅ Cache Statistics
 */

const Redis = require('ioredis');
const NodeCache = require('node-cache');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CACHE_CONFIG = {
  // Memory Cache (Level 1 - Fastest)
  memory: {
    stdTTL: 300, // 5 minutes
    checkperiod: 60, // Check every minute
    useClones: false, // Performance optimization
    maxKeys: 1000, // Max number of keys
  },

  // Redis Cache (Level 2 - Distributed)
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB || 0,
    keyPrefix: 'app:',
    retryStrategy: times => {
      if (times > 3) return null;
      return Math.min(times * 50, 2000);
    },
  },

  // TTL Settings (in seconds)
  ttl: {
    static: 86400, // 24 hours - للبيانات الثابتة
    users: 3600, // 1 hour - بيانات المستخدمين
    reports: 1800, // 30 minutes - التقارير
    queries: 600, // 10 minutes - نتائج الاستعلامات
    api: 300, // 5 minutes - API responses
    temporary: 60, // 1 minute - بيانات مؤقتة
  },
};

// ============================================================================
// CACHE MANAGER CLASS
// ============================================================================

class CacheManager {
  constructor() {
    // Level 1: Memory Cache (in-process)
    this.memoryCache = new NodeCache(CACHE_CONFIG.memory);

    // Level 2: Redis Cache (distributed)
    this.redisCache = null;
    this.redisConnected = false;

    // Statistics
    this.stats = {
      hits: 0,
      misses: 0,
      memoryHits: 0,
      redisHits: 0,
      sets: 0,
      deletes: 0,
    };

    // Initialize Redis
    this.initializeRedis();
  }

  // Initialize Redis connection
  initializeRedis() {
    try {
      this.redisCache = new Redis(CACHE_CONFIG.redis);

      this.redisCache.on('connect', () => {
        console.log('✅ Redis Cache Connected');
        this.redisConnected = true;
      });

      this.redisCache.on('error', err => {
        console.error('❌ Redis Cache Error:', err.message);
        this.redisConnected = false;
      });
    } catch (error) {
      console.error('❌ Failed to initialize Redis:', error.message);
      this.redisConnected = false;
    }
  }

  // ============================================================================
  // GET - Multi-level cache retrieval
  // ============================================================================
  async get(key, options = {}) {
    const { skipMemory = false, skipRedis = false } = options;

    try {
      // Level 1: Memory Cache
      if (!skipMemory) {
        const memoryValue = this.memoryCache.get(key);
        if (memoryValue !== undefined) {
          this.stats.hits++;
          this.stats.memoryHits++;
          return memoryValue;
        }
      }

      // Level 2: Redis Cache
      if (!skipRedis && this.redisConnected) {
        const redisValue = await this.redisCache.get(key);
        if (redisValue !== null) {
          const parsed = JSON.parse(redisValue);

          // Promote to memory cache
          this.memoryCache.set(key, parsed, CACHE_CONFIG.memory.stdTTL);

          this.stats.hits++;
          this.stats.redisHits++;
          return parsed;
        }
      }

      this.stats.misses++;
      return null;
    } catch (error) {
      console.error(`Cache GET error for key ${key}:`, error.message);
      this.stats.misses++;
      return null;
    }
  }

  // ============================================================================
  // SET - Multi-level cache storage
  // ============================================================================
  async set(key, value, ttl = null) {
    try {
      const cacheTTL = ttl || CACHE_CONFIG.ttl.api;

      // Level 1: Memory Cache
      this.memoryCache.set(key, value, cacheTTL);

      // Level 2: Redis Cache
      if (this.redisConnected) {
        await this.redisCache.setex(key, cacheTTL, JSON.stringify(value));
      }

      this.stats.sets++;
      return true;
    } catch (error) {
      console.error(`Cache SET error for key ${key}:`, error.message);
      return false;
    }
  }

  // ============================================================================
  // DELETE - Remove from all cache levels
  // ============================================================================
  async delete(key) {
    try {
      // Level 1: Memory
      this.memoryCache.del(key);

      // Level 2: Redis
      if (this.redisConnected) {
        await this.redisCache.del(key);
      }

      this.stats.deletes++;
      return true;
    } catch (error) {
      console.error(`Cache DELETE error for key ${key}:`, error.message);
      return false;
    }
  }

  // ============================================================================
  // INVALIDATE BY PATTERN - Bulk deletion
  // ============================================================================
  async invalidatePattern(pattern) {
    try {
      let deletedCount = 0;

      // Memory Cache: Manual pattern matching
      const memoryKeys = this.memoryCache.keys();
      const matchingKeys = memoryKeys.filter(key => {
        const regex = new RegExp(pattern.replace('*', '.*'));
        return regex.test(key);
      });

      matchingKeys.forEach(key => {
        this.memoryCache.del(key);
        deletedCount++;
      });

      // Redis Cache: SCAN + DEL
      if (this.redisConnected) {
        const stream = this.redisCache.scanStream({
          match: pattern,
          count: 100,
        });

        stream.on('data', async keys => {
          if (keys.length) {
            await this.redisCache.del(...keys);
            deletedCount += keys.length;
          }
        });

        await new Promise(resolve => stream.on('end', resolve));
      }

      console.log(`🗑️ Invalidated ${deletedCount} keys matching pattern: ${pattern}`);
      return deletedCount;
    } catch (error) {
      console.error(`Cache INVALIDATE error for pattern ${pattern}:`, error.message);
      return 0;
    }
  }

  // ============================================================================
  // CACHE WARMING - Pre-populate cache
  // ============================================================================
  async warm(dataLoader, keys, options = {}) {
    const { ttl = CACHE_CONFIG.ttl.api, batchSize = 10 } = options;

    try {
      console.log(`🔥 Cache warming started for ${keys.length} keys...`);
      let warmedCount = 0;

      // Process in batches
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async key => {
            try {
              const data = await dataLoader(key);
              if (data) {
                await this.set(key, data, ttl);
                warmedCount++;
              }
            } catch (err) {
              console.error(`Failed to warm cache for key ${key}:`, err.message);
            }
          })
        );
      }

      console.log(`✅ Cache warming completed: ${warmedCount}/${keys.length} keys`);
      return warmedCount;
    } catch (error) {
      console.error('Cache WARM error:', error.message);
      return 0;
    }
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================
  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? ((this.stats.hits / totalRequests) * 100).toFixed(2) : 0;

    return {
      ...this.stats,
      totalRequests,
      hitRate: `${hitRate}%`,
      memoryKeys: this.memoryCache.keys().length,
      redisConnected: this.redisConnected,
    };
  }

  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      memoryHits: 0,
      redisHits: 0,
      sets: 0,
      deletes: 0,
    };
  }

  // ============================================================================
  // FLUSH ALL
  // ============================================================================
  async flushAll() {
    try {
      // Flush memory cache
      this.memoryCache.flushAll();

      // Flush Redis cache
      if (this.redisConnected) {
        await this.redisCache.flushdb();
      }

      console.log('🗑️ All caches flushed');
      return true;
    } catch (error) {
      console.error('Cache FLUSH error:', error.message);
      return false;
    }
  }
}

// ============================================================================
// CACHE MIDDLEWARE
// ============================================================================

function cacheMiddleware(options = {}) {
  const {
    ttl = CACHE_CONFIG.ttl.api,
    keyGenerator = req => `api:${req.method}:${req.originalUrl}`,
    condition = () => true,
  } = options;

  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Check condition
    if (!condition(req)) {
      return next();
    }

    const cacheKey = keyGenerator(req);

    try {
      // Try to get from cache
      const cachedData = await cacheManager.get(cacheKey);

      if (cachedData) {
        return res.json({
          ...cachedData,
          _cached: true,
          _cacheKey: cacheKey,
        });
      }

      // Intercept res.json to cache the response
      const originalJson = res.json.bind(res);
      res.json = data => {
        // Cache the response
        cacheManager.set(cacheKey, data, ttl).catch(console.error);

        // Send response
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error.message);
      next();
    }
  };
}

// ============================================================================
// CACHE HELPERS
// ============================================================================

// Generate cache key with parameters
function generateCacheKey(prefix, params = {}) {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join(':');

  return `${prefix}:${sortedParams}`;
}

// Cache decorator for functions
function cacheResult(ttl = 300) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args) {
      const cacheKey = `fn:${propertyKey}:${JSON.stringify(args)}`;

      // Check cache
      const cached = await cacheManager.get(cacheKey);
      if (cached) return cached;

      // Execute and cache
      const result = await originalMethod.apply(this, args);
      await cacheManager.set(cacheKey, result, ttl);

      return result;
    };

    return descriptor;
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

const cacheManager = new CacheManager();

module.exports = {
  cacheManager,
  cacheMiddleware,
  generateCacheKey,
  cacheResult,
  CACHE_CONFIG,
};
