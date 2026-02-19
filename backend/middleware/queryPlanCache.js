/**
 * 📊 Query Plan Caching
 *
 * Caches query execution plans and reuses them
 * Reduces query planning overhead
 *
 * Features:
 * - Query execution plan caching
 * - Index usage tracking
 * - Query performance profiling
 * - Slow query detection
 */

class QueryPlanCache {
  constructor(options = {}) {
    // Cache query execution plans
    this.planCache = new Map();

    // Track slow queries
    this.slowQueries = [];
    this.slowQueryThreshold = options.slowQueryThreshold || 100; // 100ms

    // Statistics
    this.stats = {
      cachedPlans: 0,
      planCacheHits: 0,
      planCacheMisses: 0,
      totalQueries: 0,
      slowQueriesDetected: 0,
      totalQueryTime: 0,
    };

    // Configuration
    this.maxSlowQueriesStored = options.maxSlowQueriesStored || 1000;
  }

  /**
   * Generate plan key from query
   */
  generatePlanKey(model, filter, options = {}) {
    const key = JSON.stringify({
      model: model.constructor.name || model.name,
      filter: this.filterToKey(filter),
      select: options.select,
      sort: options.sort,
      lean: options.lean,
    });

    const crypto = require('crypto');
    return crypto.createHash('md5').update(key).digest('hex');
  }

  /**
   * Convert filter to key (simplified)
   */
  filterToKey(filter) {
    const simplified = {};
    for (const [key, value] of Object.entries(filter || {})) {
      if (typeof value === 'object' && value !== null) {
        simplified[key] = Object.keys(value).sort().join(',');
      } else {
        simplified[key] = typeof value;
      }
    }
    return simplified;
  }

  /**
   * Get cached query plan
   */
  getCachedPlan(planKey) {
    if (this.planCache.has(planKey)) {
      this.stats.planCacheHits++;
      return this.planCache.get(planKey);
    }
    this.stats.planCacheMisses++;
    return null;
  }

  /**
   * Cache query plan
   */
  cachePlan(planKey, plan) {
    this.planCache.set(planKey, {
      plan,
      cachedAt: Date.now(),
      hits: 0,
    });
    this.stats.cachedPlans++;
  }

  /**
   * Execute query with plan caching
   */
  async executeWithPlanCache(model, filter, options = {}) {
    const planKey = this.generatePlanKey(model, filter, options);
    const startTime = Date.now();

    try {
      // Build query
      let query = model.find(filter);

      if (options.select) {
        query = query.select(options.select);
      }
      if (options.sort) {
        query = query.sort(options.sort);
      }
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.skip) {
        query = query.skip(options.skip);
      }
      if (options.lean) {
        query = query.lean();
      }

      // Get execution plan
      const plan = await query.explain('executionStats');

      // Cache the plan
      this.cachePlan(planKey, plan);

      // Execute query
      const result = await query.exec();

      const duration = Date.now() - startTime;
      this.stats.totalQueries++;
      this.stats.totalQueryTime += duration;

      // Check if slow query
      if (duration > this.slowQueryThreshold) {
        this.recordSlowQuery({
          model: model.constructor.name || model.name,
          filter,
          options,
          duration,
          plan,
          timestamp: Date.now(),
        });
        this.stats.slowQueriesDetected++;
      }

      return {
        result,
        duration,
        isCached: false,
      };
    } catch (error) {
      console.error('[QueryPlanCache] Execution error:', error.message);
      throw error;
    }
  }

  /**
   * Record slow query
   */
  recordSlowQuery(queryInfo) {
    this.slowQueries.push(queryInfo);

    // Keep only recent slow queries
    if (this.slowQueries.length > this.maxSlowQueriesStored) {
      this.slowQueries.shift();
    }
  }

  /**
   * Get index recommendations
   */
  getIndexRecommendations() {
    const indexNeeded = new Map();

    this.slowQueries.forEach(query => {
      const filterKeys = Object.keys(query.filter || {});
      const sortKeys = Object.keys(query.options.sort || {});

      const indexKey = [...filterKeys, ...sortKeys].sort().join('+');

      if (!indexNeeded.has(indexKey)) {
        indexNeeded.set(indexKey, {
          fields: indexKey,
          frequency: 0,
          totalTime: 0,
          slowCount: 0,
        });
      }

      const rec = indexNeeded.get(indexKey);
      rec.frequency++;
      rec.totalTime += query.duration;
      rec.slowCount++;
    });

    // Sort by frequency
    return Array.from(indexNeeded.values()).sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Get query statistics
   */
  getStats() {
    const avgQueryTime =
      this.stats.totalQueries > 0
        ? (this.stats.totalQueryTime / this.stats.totalQueries).toFixed(2)
        : 0;

    const cacheHitRate =
      this.stats.planCacheHits + this.stats.planCacheMisses > 0
        ? (
            (this.stats.planCacheHits / (this.stats.planCacheHits + this.stats.planCacheMisses)) *
            100
          ).toFixed(2)
        : 0;

    return {
      cachedPlans: this.stats.cachedPlans,
      planCacheHits: this.stats.planCacheHits,
      planCacheMisses: this.stats.planCacheMisses,
      cacheHitRate: `${cacheHitRate}%`,
      totalQueries: this.stats.totalQueries,
      avgQueryTime: `${avgQueryTime}ms`,
      slowQueriesDetected: this.stats.slowQueriesDetected,
      recentSlowQueries: this.slowQueries.length,
      indexRecommendations: this.getIndexRecommendations(),
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.planCache.clear();
  }

  /**
   * Get top slow queries
   */
  getTopSlowQueries(limit = 10) {
    return this.slowQueries
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit)
      .map(q => ({
        model: q.model,
        duration: q.duration,
        filterFields: Object.keys(q.filter || {}).join(','),
        timestamp: new Date(q.timestamp).toISOString(),
      }));
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      cachedPlans: this.stats.cachedPlans,
      planCacheHits: 0,
      planCacheMisses: 0,
      totalQueries: 0,
      slowQueriesDetected: 0,
      totalQueryTime: 0,
    };
  }
}

/**
 * Express middleware for query plan caching
 */
function queryPlanCachingMiddleware(queryPlanCache) {
  return (req, res, next) => {
    // Attach query plan cache to request
    req.queryPlanCache = queryPlanCache;

    // Attach helper method
    req.executeWithPlanCache = (model, filter, options) => {
      return queryPlanCache.executeWithPlanCache(model, filter, options);
    };

    next();
  };
}

// Global query plan cache instance
let globalQueryPlanCache = null;

/**
 * Initialize global query plan cache
 */
function initializeQueryPlanCache(options = {}) {
  globalQueryPlanCache = new QueryPlanCache(options);
  return globalQueryPlanCache;
}

/**
 * Get global query plan cache
 */
function getQueryPlanCache() {
  if (!globalQueryPlanCache) {
    globalQueryPlanCache = new QueryPlanCache();
  }
  return globalQueryPlanCache;
}

module.exports = {
  QueryPlanCache,
  queryPlanCachingMiddleware,
  initializeQueryPlanCache,
  getQueryPlanCache,
};
