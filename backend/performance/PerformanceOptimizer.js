/**
 * Performance Optimization Module - Phase 9
 * Advanced caching, query optimization, and performance enhancement
 */

const redis = require('redis');

class PerformanceOptimizer {
  /**
   * Advanced Caching Strategy
   */
  static class CacheManager {
    constructor(redisClient) {
      this.redis = redisClient;
      this.cacheStrategies = new Map();
      this.metrics = {
        hits: 0,
        misses: 0,
        evictions: 0
      };
    }

    /**
     * Get cached value or compute and cache
     */
    async getOrCompute(key, computeFn, options = {}) {
      const ttl = options.ttl || 3600; // Default 1 hour
      const strategy = options.strategy || 'standard'; // standard, sliding, lru

      try {
        // Try to get from cache
        const cached = await this.redis.get(key);
        if (cached) {
          this.metrics.hits++;

          // Sliding window expiration
          if (strategy === 'sliding') {
            await this.redis.expire(key, ttl);
          }

          return JSON.parse(cached);
        }

        this.metrics.misses++;

        // Compute and cache
        const value = await computeFn();
        await this.redis.setex(key, ttl, JSON.stringify(value));

        return value;
      } catch (error) {
        console.error(`Cache error for ${key}:`, error);
        return await computeFn();
      }
    }

    /**
     * Cache warming - pre-load frequent data
     */
    async warmCache(patterns) {
      console.log('Warming up cache with patterns:', patterns);

      for (const pattern of patterns) {
        const data = await pattern.getValue();
        await this.redis.setex(
          pattern.key,
          pattern.ttl || 3600,
          JSON.stringify(data)
        );
      }
    }

    /**
     * Batch cache operations
     */
    async getMultiple(keys) {
      const values = await this.redis.mget(keys);
      const results = {};

      keys.forEach((key, index) => {
        try {
          results[key] = values[index] ? JSON.parse(values[index]) : null;
        } catch (error) {
          results[key] = null;
        }
      });

      return results;
    }

    /**
     * Cache invalidation with pattern matching
     */
    async invalidatePattern(pattern) {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(keys);
        this.metrics.evictions += keys.length;
      }
      return keys.length;
    }

    /**
     * Get cache metrics
     */
    getMetrics() {
      const total = this.metrics.hits + this.metrics.misses;
      return {
        hits: this.metrics.hits,
        misses: this.metrics.misses,
        hitRate: total > 0 ? (this.metrics.hits / total * 100).toFixed(2) + '%' : 'N/A',
        evictions: this.metrics.evictions
      };
    }

    /**
     * Reset metrics
     */
    resetMetrics() {
      this.metrics = { hits: 0, misses: 0, evictions: 0 };
    }
  }

  /**
   * Database Query Optimizer
   */
  static class QueryOptimizer {
    /**
     * Generate optimized MongoDB query with indexes
     */
    static createOptimizedQuery(collection, filters, options = {}) {
      let query = collection.find(filters);

      // Add indexing recommendations
      const indexes = this.getRecommendedIndexes(filters, options);

      // Apply sorting
      if (options.sort) {
        query = query.sort(options.sort);
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.skip) {
        query = query.skip(options.skip);
      }

      // Selection projection (only fetch needed fields)
      if (options.projection) {
        query = query.project(options.projection);
      }

      return {
        query,
        indexes,
        estimatedExecutionTime: this.estimateExecutionTime(filters)
      };
    }

    /**
     * Get recommended indexes for query
     */
    static getRecommendedIndexes(filters, options = {}) {
      const indexes = [];

      // Index on filter fields
      Object.keys(filters).forEach(field => {
        indexes.push({
          field,
          type: 'standard',
          priority: 'high'
        });
      });

      // Compound index for common filter + sort combinations
      if (options.sort) {
        Object.keys(options.sort).forEach(field => {
          indexes.push({
            fields: [Object.keys(filters)[0], field],
            type: 'compound',
            priority: 'medium'
          });
        });
      }

      return indexes;
    }

    /**
     * Estimate query execution time
     */
    static estimateExecutionTime(filters) {
      // Simplified estimation
      const filterCount = Object.keys(filters).length;
      const baseTime = 10; // ms
      return baseTime + filterCount * 2;
    }

    /**
     * Analyze slow queries
     */
    static async analyzeSlowQueries(db, threshold = 100) {
      // Query system.profile collection for slow queries
      const slowQueries = await db
        .collection('system.profile')
        .find({
          millis: { $gt: threshold }
        })
        .sort({ millis: -1 })
        .limit(20)
        .toArray();

      return slowQueries.map(q => ({
        operation: q.op,
        namespace: q.ns,
        duration: q.millis,
        timestamp: q.ts,
        indexes: q.planSummary
      }));
    }
  }

  /**
   * API Response Optimization
   */
  static class ResponseOptimizer {
    /**
     * Compress response
     */
    static compressResponse(data) {
      const compressed = JSON.stringify(data).length;
      return {
        original: JSON.stringify(data).length,
        compressed,
        ratio: (
          (1 - compressed / JSON.stringify(data).length) *
          100
        ).toFixed(2) + '%'
      };
    }

    /**
     * Minify JSON response
     */
    static minifyJSON(obj) {
      return JSON.stringify(obj, null, 0);
    }

    /**
     * Paginate large result sets
     */
    static paginateResults(results, page = 1, pageSize = 20) {
      const total = results.length;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;

      return {
        data: results.slice(start, end),
        pagination: {
          currentPage: page,
          pageSize,
          totalRecords: total,
          totalPages: Math.ceil(total / pageSize),
          hasNextPage: end < total,
          hasPreviousPage: page > 1
        }
      };
    }

    /**
     * Select specific fields (projection)
     */
    static selectFields(obj, fields) {
      const result = {};
      fields.forEach(field => {
        if (field in obj) {
          result[field] = obj[field];
        }
      });
      return result;
    }

    /**
     * Filter sensitive data from response
     */
    static removeSensitiveData(obj, sensitiveFields = []) {
      const filtered = { ...obj };
      sensitiveFields.forEach(field => {
        delete filtered[field];
      });
      return filtered;
    }
  }

  /**
   * Request Debouncing & Throttling
   */
  static class RateLimiter {
    constructor(maxRequests = 100, windowMs = 60000) {
      this.maxRequests = maxRequests;
      this.windowMs = windowMs;
      this.requests = new Map();
    }

    /**
     * Check if request is allowed
     */
    isAllowed(key) {
      const now = Date.now();
      const userRequests = this.requests.get(key) || [];

      // Remove old requests outside the window
      const validRequests = userRequests.filter(t => now - t < this.windowMs);

      if (validRequests.length < this.maxRequests) {
        validRequests.push(now);
        this.requests.set(key, validRequests);
        return {
          allowed: true,
          remaining: this.maxRequests - validRequests.length
        };
      }

      return {
        allowed: false,
        retryAfter: Math.ceil((validRequests[0] + this.windowMs - now) / 1000)
      };
    }

    /**
     * Get user request status
     */
    getStatus(key) {
      const now = Date.now();
      const userRequests = this.requests.get(key) || [];
      const validRequests = userRequests.filter(t => now - t < this.windowMs);

      return {
        current: validRequests.length,
        limit: this.maxRequests,
        remaining: this.maxRequests - validRequests.length,
        resetAt: validRequests.length > 0
          ? new Date(validRequests[0] + this.windowMs)
          : new Date()
      };
    }
  }

  /**
   * Performance Monitoring
   */
  static class PerformanceMonitor {
    constructor() {
      this.metrics = [];
    }

    /**
     * Record request performance
     */
    recordMetric(endpoint, duration, statusCode, timestamp = Date.now()) {
      this.metrics.push({
        endpoint,
        duration,
        statusCode,
        timestamp
      });

      // Keep only last 1000 metrics
      if (this.metrics.length > 1000) {
        this.metrics.shift();
      }
    }

    /**
     * Get endpoint performance summary
     */
    getEndpointMetrics(endpoint) {
      const endpointMetrics = this.metrics.filter(
        m => m.endpoint === endpoint
      );

      if (endpointMetrics.length === 0) {
        return null;
      }

      const durations = endpointMetrics.map(m => m.duration);
      const sorted = durations.sort((a, b) => a - b);

      return {
        endpoint,
        calls: endpointMetrics.length,
        avgDuration: (
          durations.reduce((a, b) => a + b, 0) / durations.length
        ).toFixed(2),
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
        p95Duration: sorted[Math.floor(sorted.length * 0.95)],
        p99Duration: sorted[Math.floor(sorted.length * 0.99)],
        errorRate: (
          (endpointMetrics.filter(m => m.statusCode >= 400).length /
            endpointMetrics.length) *
          100
        ).toFixed(2) + '%'
      };
    }

    /**
     * Get overall performance summary
     */
    getOverallMetrics() {
      if (this.metrics.length === 0) {
        return null;
      }

      const durations = this.metrics.map(m => m.duration);
      const sorted = durations.sort((a, b) => a - b);

      return {
        totalRequests: this.metrics.length,
        avgDuration: (
          durations.reduce((a, b) => a + b, 0) / durations.length
        ).toFixed(2),
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
        p95Duration: sorted[Math.floor(sorted.length * 0.95)],
        p99Duration: sorted[Math.floor(sorted.length * 0.99)],
        errorRate: (
          (this.metrics.filter(m => m.statusCode >= 400).length /
            this.metrics.length) *
          100
        ).toFixed(2) + '%'
      };
    }
  }
}

module.exports = PerformanceOptimizer;
