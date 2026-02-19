/**
 * ⚡ Performance Optimization Module
 * تحسينات الأداء الشاملة
 *
 * Includes:
 * - Redis Caching
 * - Query Optimization
 * - Asset Compression
 * - Database Indexing
 */

const redis = require('redis');
const compression = require('compression');
const helmet = require('helmet');

/**
 * 1️⃣ Redis Caching Layer
 */
class CacheManager {
  constructor(redisUrl = 'redis://localhost:6379') {
    this.client = redis.createClient({ url: redisUrl });
    this.client.on('error', err => console.error('Redis error:', err));
    this.client.connect();
    this.defaultTTL = 3600; // 1 hour
  }

  /**
   * Set cache with TTL
   */
  async set(key, value, ttl = this.defaultTTL) {
    try {
      const serialized = JSON.stringify(value);
      await this.client.setEx(key, ttl, serialized);
      console.log(`✅ Cache SET: ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      console.error(`❌ Cache SET error: ${key}`, error);
      return false;
    }
  }

  /**
   * Get from cache
   */
  async get(key) {
    try {
      const value = await this.client.get(key);
      if (value) {
        console.log(`✅ Cache HIT: ${key}`);
        return JSON.parse(value);
      }
      console.log(`⚠️  Cache MISS: ${key}`);
      return null;
    } catch (error) {
      console.error(`❌ Cache GET error: ${key}`, error);
      return null;
    }
  }

  /**
   * Delete cache key
   */
  async delete(key) {
    try {
      await this.client.del(key);
      console.log(`✅ Cache DEL: ${key}`);
      return true;
    } catch (error) {
      console.error(`❌ Cache DEL error: ${key}`, error);
      return false;
    }
  }

  /**
   * Clear all cache
   */
  async clear() {
    try {
      await this.client.flushAll();
      console.log('✅ Cache cleared');
      return true;
    } catch (error) {
      console.error('❌ Cache clear error', error);
      return false;
    }
  }
}

/**
 * 2️⃣ Caching Middleware for Express
 */
function createCacheMiddleware(cache, options = {}) {
  const defaultOptions = {
    keyPrefix: 'api:',
    ttl: 3600,
    excludeStatusCodes: [401, 403, 404],
    excludeMethods: ['POST', 'PUT', 'DELETE', 'PATCH'],
  };

  const config = { ...defaultOptions, ...options };

  return (req, res, next) => {
    // Skip caching for certain methods
    if (config.excludeMethods.includes(req.method)) {
      return next();
    }

    const cacheKey = `${config.keyPrefix}${req.originalUrl}`;

    // Intercept response.json
    const originalJson = res.json.bind(res);
    res.json = function (data) {
      // Cache successful responses
      if (res.statusCode === 200) {
        cache.set(cacheKey, data, config.ttl);
      }
      return originalJson(data);
    };

    next();
  };
}

/**
 * 3️⃣ Query Cache Wrapper for MongoDB
 */
function createQueryCache(cache) {
  return {
    /**
     * Cache database queries
     */
    async execute(model, operation, params, ttl = 3600) {
      const cacheKey = `query:${model}:${operation}:${JSON.stringify(params)}`;

      // Try to get from cache
      const cached = await cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Execute query and cache result
      let result;
      try {
        switch (operation) {
          case 'findById':
            result = await model.findById(params.id).lean();
            break;
          case 'find':
            result = await model.find(params.query).lean();
            break;
          case 'findOne':
            result = await model.findOne(params.query).lean();
            break;
          case 'aggregate':
            result = await model.aggregate(params.pipeline);
            break;
          default:
            result = null;
        }

        if (result) {
          await cache.set(cacheKey, result, ttl);
        }
        return result;
      } catch (error) {
        console.error(`Query error: ${operation}`, error);
        return null;
      }
    },

    /**
     * Invalidate queries by pattern
     */
    async invalidate(pattern) {
      // In production, use Redis SCAN to find keys by pattern
      console.log(`Invalidating cache: ${pattern}`);
    },
  };
}

/**
 * 4️⃣ Database Index Configuration
 */
const databaseIndexes = {
  cases: [
    { fields: { beneficiaryId: 1 }, options: { name: 'idx_beneficiary' } },
    { fields: { status: 1 }, options: { name: 'idx_status' } },
    { fields: { createdAt: -1 }, options: { name: 'idx_created' } },
    { fields: { beneficiaryId: 1, status: 1 }, options: { name: 'idx_beneficiary_status' } },
    { fields: { text: 'text' }, options: { name: 'idx_text_search' } },
  ],
  assessments: [
    { fields: { caseId: 1 }, options: { name: 'idx_case' } },
    { fields: { assessmentType: 1 }, options: { name: 'idx_type' } },
    { fields: { status: 1 }, options: { name: 'idx_status' } },
    { fields: { caseId: 1, assessmentType: 1 }, options: { name: 'idx_case_type' } },
    { fields: { createdAt: -1 }, options: { name: 'idx_created' } },
  ],
  users: [
    { fields: { email: 1 }, options: { unique: true, name: 'idx_email' } },
    { fields: { username: 1 }, options: { unique: true, name: 'idx_username' } },
    { fields: { role: 1 }, options: { name: 'idx_role' } },
    { fields: { active: 1 }, options: { name: 'idx_active' } },
  ],
};

/**
 * 5️⃣ API Response Optimization
 */
function createOptimizedResponseMiddleware() {
  return (req, res, next) => {
    // Add compression
    res.setHeader('Content-Encoding', 'gzip');

    // Cache headers
    res.set({
      'Cache-Control': 'public, max-age=3600',
      ETag: undefined, // Will be calculated by compress
    });

    // Vary header for CDN caching
    res.set('Vary', 'Accept-Encoding');

    next();
  };
}

/**
 * 6️⃣ Pagination Optimization
 */
class PaginationHelper {
  static getPaginationOptions(page = 1, limit = 50) {
    const maxLimit = 100;
    const safeLimit = Math.min(limit, maxLimit);
    const safeSkip = (page - 1) * safeLimit;

    return {
      skip: safeSkip,
      limit: safeLimit,
      page,
    };
  }

  static getMetadata(total, page, limit) {
    const pageSize = limit;
    const totalPages = Math.ceil(total / pageSize);

    return {
      total,
      page,
      pageSize,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }
}

/**
 * 7️⃣ Query Optimization Utilities
 */
class QueryOptimizer {
  /**
   * Optimize MongoDB lean queries
   */
  static applyLean(query) {
    return query.lean();
  }

  /**
   * Limit returned fields
   */
  static limitFields(query, fields = {}) {
    return query.select(fields);
  }

  /**
   * Add indexes to frequently queried fields
   */
  static async createIndexes(model, indexes) {
    try {
      for (const indexConfig of indexes) {
        await model.collection.createIndex(indexConfig.fields, indexConfig.options);
      }
      console.log(`✅ Indexes created for ${model.modelName}`);
    } catch (error) {
      console.error(`❌ Index creation error: ${error.message}`);
    }
  }
}

/**
 * 8️⃣ Monitoring & Metrics
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      queryCount: 0,
      totalQueryTime: 0,
      averageResponseTime: 0,
      requestCount: 0,
    };
  }

  recordCacheHit() {
    this.metrics.cacheHits++;
  }

  recordCacheMiss() {
    this.metrics.cacheMisses++;
  }

  recordQuery(duration) {
    this.metrics.queryCount++;
    this.metrics.totalQueryTime += duration;
  }

  recordRequest(duration) {
    this.metrics.requestCount++;
    this.metrics.averageResponseTime = this.metrics.totalQueryTime / this.metrics.requestCount;
  }

  getMetrics() {
    const hitRate =
      (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100;

    return {
      ...this.metrics,
      cacheHitRate: hitRate.toFixed(2) + '%',
      averageQueryTime: (this.metrics.totalQueryTime / this.metrics.queryCount).toFixed(2) + 'ms',
    };
  }

  printReport() {
    console.log('\n📊 Performance Metrics:');
    console.log(JSON.stringify(this.getMetrics(), null, 2));
  }
}

module.exports = {
  CacheManager,
  createCacheMiddleware,
  createQueryCache,
  createOptimizedResponseMiddleware,
  databaseIndexes,
  PaginationHelper,
  QueryOptimizer,
  PerformanceMonitor,
};
