/**
 * Advanced Query Optimizer
 * نظام تحسين queries المتقدم مع caching و batching
 */

let NodeCache;
try {
  NodeCache = require('node-cache');
} catch (e) {
  // Create a mock cache if node-cache is not available
  NodeCache = class {
    constructor() {}
    get() {
      return null;
    }
    set() {}
    del() {}
    flush() {}
  };
}

// Cache for query results (10 minute TTL)
const queryCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

class QueryOptimizer {
  constructor() {
    this.queryStats = {
      total: 0,
      cached: 0,
      slowQueries: 0,
      avgTime: 0,
    };
    this.slowQueryThreshold = 100; // ms
    this.slowQueries = [];
  }

  /**
   * Generate cache key from query
   */
  generateCacheKey(collection, query, projection) {
    return `${collection}:${JSON.stringify(query)}:${JSON.stringify(projection || {})}`;
  }

  /**
   * Get from cache or execute query
   */
  async getOrExecute(collection, query, projection, executeQuery, ttl = 600) {
    const cacheKey = this.generateCacheKey(collection, query, projection);

    // Try cache first
    const cached = queryCache.get(cacheKey);
    if (cached) {
      this.queryStats.cached++;
      return { data: cached, fromCache: true };
    }

    // Execute query
    const startTime = Date.now();
    const result = await executeQuery();
    const duration = Date.now() - startTime;

    // Track stats
    this.queryStats.total++;
    this.recordQueryTime(duration, collection, query);

    // Cache result
    queryCache.set(cacheKey, result, ttl);

    return { data: result, fromCache: false, duration };
  }

  /**
   * Record query time
   */
  recordQueryTime(duration, collection, query) {
    if (duration > this.slowQueryThreshold) {
      this.queryStats.slowQueries++;
      this.slowQueries.push({
        collection,
        query: JSON.stringify(query).substring(0, 100),
        duration,
        timestamp: new Date().toISOString(),
      });

      // Keep only last 100
      if (this.slowQueries.length > 100) {
        this.slowQueries.shift();
      }
    }

    // Update average
    const allTimes = this.queryStats.total;
    this.queryStats.avgTime = (
      (this.queryStats.avgTime * (allTimes - 1) + duration) /
      allTimes
    ).toFixed(2);
  }

  /**
   * Batch queries
   */
  batchQueries(queries) {
    const batched = {};

    queries.forEach(({ collection, query }) => {
      const key = `${collection}:${JSON.stringify(query)}`;
      if (!batched[key]) {
        batched[key] = { collection, query, count: 0 };
      }
      batched[key].count++;
    });

    return Object.values(batched);
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      ...this.queryStats,
      cacheHitRate:
        this.queryStats.total > 0
          ? ((this.queryStats.cached / this.queryStats.total) * 100).toFixed(2) + '%'
          : '0%',
      slowQueriesCount: this.slowQueries.length,
      recentSlowQueries: this.slowQueries.slice(-5),
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    queryCache.flushAll();
    this.queryStats = {
      total: 0,
      cached: 0,
      slowQueries: 0,
      avgTime: 0,
    };
  }

  /**
   * Get query recommendations
   */
  getRecommendations() {
    const recommendations = [];

    if (this.queryStats.avgTime > 50) {
      recommendations.push({
        severity: 'HIGH',
        message: 'Average query time is high. Consider adding indexes.',
        avgTime: this.queryStats.avgTime,
      });
    }

    if (this.queryStats.slowQueries > 10) {
      recommendations.push({
        severity: 'MEDIUM',
        message: 'Multiple slow queries detected. Review query patterns.',
        slowCount: this.queryStats.slowQueries,
      });
    }

    if ((this.queryStats.cached / this.queryStats.total) * 100 < 30) {
      recommendations.push({
        severity: 'LOW',
        message: 'Cache hit rate is low. Consider adjusting TTL values.',
        cacheRate: ((this.queryStats.cached / this.queryStats.total) * 100).toFixed(2),
      });
    }

    return recommendations;
  }
}

// Singleton instance
const queryOptimizer = new QueryOptimizer();

/**
 * Middleware for query optimization
 */
const queryOptimizationMiddleware = (req, res, next) => {
  // Add optimized query method to req
  req.optimizedQuery = async (collection, query, projection, executeQuery, ttl) => {
    return queryOptimizer.getOrExecute(collection, query, projection, executeQuery, ttl);
  };

  next();
};

/**
 * Caching decorator for methods
 */
function cacheQuery(ttl = 600) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args) {
      const cacheKey = `${propertyKey}:${JSON.stringify(args)}`;

      // Try cache
      const cached = queryCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Execute and cache
      const result = await originalMethod.apply(this, args);
      queryCache.set(cacheKey, result, ttl);

      return result;
    };

    return descriptor;
  };
}

module.exports = {
  queryOptimizer,
  queryOptimizationMiddleware,
  cacheQuery,
  QueryOptimizer,
};
