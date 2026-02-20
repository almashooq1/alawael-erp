/**
 * Dashboard Performance & Caching Service
 * Optimizes dashboard performance with intelligent caching and compression
 */

const logger = require('../utils/logger');

class DashboardPerformanceService {
  constructor() {
    this.cache = new Map();
    this.queryCache = new Map();
    this.performanceMetrics = [];
    this.cacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0,
    };
    this.maxCacheSize = 100; // Maximum items in cache
    this.compressionEnabled = true;
  }

  /**
   * Set cache item with TTL
   */
  set(key, value, ttl = 300000) {
    // 5 minutes default TTL
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldest();
    }

    const cacheEntry = {
      value,
      ttl,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + ttl),
      accessCount: 0,
      lastAccessed: new Date(),
    };

    this.cache.set(key, cacheEntry);
    logger.debug(`💾 Cached: ${key} (TTL: ${ttl}ms)`);

    return cacheEntry;
  }

  /**
   * Get cache item
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      this.cacheStats.misses++;
      return null;
    }

    // Check if expired
    if (entry.expiresAt < new Date()) {
      this.cache.delete(key);
      this.cacheStats.misses++;
      return null;
    }

    entry.accessCount++;
    entry.lastAccessed = new Date();
    this.cacheStats.hits++;

    return entry.value;
  }

  /**
   * Cache query result
   */
  cacheQuery(queryKey, data, ttl = 300000) {
    const cacheKey = `query_${queryKey}`;
    return this.set(cacheKey, data, ttl);
  }

  /**
   * Get cached query result
   */
  getCachedQuery(queryKey) {
    const cacheKey = `query_${queryKey}`;
    return this.get(cacheKey);
  }

  /**
   * Evict oldest cache entry based on access patterns
   */
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;
    let lowestScore = Infinity;

    // Use access count and age for eviction decision (LRU variant)
    this.cache.forEach((entry, key) => {
      const score = entry.accessCount > 0 ? entry.lastAccessed.getTime() : entry.createdAt.getTime();

      if (score < lowestScore) {
        lowestScore = score;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.cacheStats.evictions++;
      logger.debug(`🗑️  Evicted cache entry: ${oldestKey}`);
    }
  }

  /**
   * Clear all cache
   */
  clearCache() {
    this.cache.clear();
    logger.info('🧹 Cache cleared');
  }

  /**
   * Clear expired entries
   */
  clearExpired() {
    const now = new Date();
    let expiredCount = 0;

    this.cache.forEach((entry, key) => {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
        expiredCount++;
      }
    });

    if (expiredCount > 0) {
      logger.info(`🧹 Cleared ${expiredCount} expired cache entries`);
    }

    return expiredCount;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate = total > 0 ? ((this.cacheStats.hits / total) * 100).toFixed(2) : 0;

    return {
      ...this.cacheStats,
      hitRate: `${hitRate}%`,
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      timestamp: new Date(),
    };
  }

  /**
   * Record performance metric
   */
  recordMetric(operation, duration, success = true) {
    const metric = {
      operation,
      duration,
      success,
      timestamp: new Date(),
    };

    this.performanceMetrics.push(metric);

    // Keep only last 1000 metrics
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics = this.performanceMetrics.slice(-1000);
    }

    return metric;
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(operation = null) {
    let metrics = this.performanceMetrics;

    if (operation) {
      metrics = metrics.filter(m => m.operation === operation);
    }

    if (metrics.length === 0) {
      return null;
    }

    const durations = metrics.map(m => m.duration);
    const successCount = metrics.filter(m => m.success).length;

    return {
      operation: operation || 'all',
      count: metrics.length,
      avgDuration: (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2),
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      successRate: ((successCount / metrics.length) * 100).toFixed(2),
      timestamp: new Date(),
    };
  }

  /**
   * Get slow queries
   */
  getSlowQueries(threshold = 1000) {
    return this.performanceMetrics
      .filter(m => m.duration > threshold && m.operation.includes('query'))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 20);
  }

  /**
   * Compress data for transmission
   */
  compressData(data) {
    if (!this.compressionEnabled) {
      return data;
    }

    // Simple compression: remove null values and minimize keys
    return JSON.parse(
      JSON.stringify(data, (key, value) => {
        if (value === null || value === undefined || value === '') {
          return undefined;
        }
        return value;
      })
    );
  }

  /**
   * Pre-cache critical data
   */
  precacheCriticalData(executiveAnalyticsService) {
    try {
      // Cache dashboard overview
      const dashboardData = executiveAnalyticsService.getExecutiveDashboard();
      this.set('dashboard_overview', dashboardData, 600000); // 10 minutes

      // Cache KPI summaries
      const kpis = executiveAnalyticsService.getAllKPIs();
      this.set('all_kpis', kpis, 300000); // 5 minutes

      logger.info('✅ Critical data pre-cached');
      return true;
    } catch (error) {
      logger.error('❌ Error pre-caching critical data:', error);
      return false;
    }
  }

  /**
   * Implement cache warming
   */
  warmCache(executiveAnalyticsService, aiInsightsService) {
    try {
      // Warm analytics cache
      const kpis = executiveAnalyticsService.getAllKPIs();
      kpis.forEach((kpi) => {
        const details = executiveAnalyticsService.getKPIDetails(kpi.id);
        this.set(`kpi_${kpi.id}_details`, details, 300000);
      });

      // Warm AI insights cache
      const insights = aiInsightsService.generateInsights();
      this.set('ai_insights', insights, 600000);

      logger.info(`🔥 Warmed cache with ${kpis.length} KPI details`);
      return true;
    } catch (error) {
      logger.error('❌ Error warming cache:', error);
      return false;
    }
  }

  /**
   * Get dashboard health
   */
  getDashboardHealth() {
    return {
      cache: this.getCacheStats(),
      performance: this.getPerformanceStats(),
      slowQueries: this.getSlowQueries(500),
      metricsTracked: this.performanceMetrics.length,
      timestamp: new Date(),
    };
  }

  /**
   * Optimize large dataset
   */
  optimizeDataset(data, options = {}) {
    const {
      maxItems = 100,
      summarizeAfter = 50,
      deepCopy = false,
    } = options;

    let optimized = deepCopy ? JSON.parse(JSON.stringify(data)) : data;

    // Paginate if too large
    if (Array.isArray(optimized) && optimized.length > maxItems) {
      optimized = optimized.slice(0, maxItems);
    }

    // Summarize if needed
    if (
      Array.isArray(optimized) &&
      optimized.length > summarizeAfter &&
      optimized[0]?.history
    ) {
      optimized = optimized.map((item) => ({
        ...item,
        history: item.history?.slice(0, 10), // Keep only recent history
      }));
    }

    return optimized;
  }

  /**
   * Set aggressive caching mode
   */
  setAggressiveCaching(enabled = true) {
    if (enabled) {
      this.maxCacheSize = 500;
      logger.info('⚡ Aggressive caching mode enabled');
    } else {
      this.maxCacheSize = 100;
      logger.info('⚡ Normal caching mode');
    }
  }

  /**
   * Get memory usage estimate
   */
  getMemoryEstimate() {
    let totalSize = 0;

    this.cache.forEach((entry) => {
      totalSize += JSON.stringify(entry.value).length;
    });

    return {
      estimatedBytes: totalSize,
      estimatedKB: (totalSize / 1024).toFixed(2),
      itemCount: this.cache.size,
      avgItemSize: (totalSize / Math.max(this.cache.size, 1)).toFixed(2),
    };
  }

  /**
   * Invalidate related caches
   */
  invalidateRelated(pattern) {
    let invalidatedCount = 0;

    this.cache.forEach((entry, key) => {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        invalidatedCount++;
      }
    });

    logger.info(`🔄 Invalidated ${invalidatedCount} cache entries matching: ${pattern}`);
    return invalidatedCount;
  }
}

module.exports = new DashboardPerformanceService();
