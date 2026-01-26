/**
 * Performance Optimization Service
 * Caching, compression, and optimization strategies
 */

const Redis = require('redis');
const zlib = require('zlib');
const { promisify } = require('util');

class PerformanceOptimizer {
  constructor() {
    // Initialize Redis client if available
    try {
      this.redisClient = Redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
      });

      this.redisClient.on('error', err => {
        console.warn('Redis client error:', err);
        this.cacheEnabled = false;
      });

      this.cacheEnabled = true;
    } catch (error) {
      console.warn('Redis unavailable, using in-memory cache:', error.message);
      this.inMemoryCache = new Map();
      this.cacheEnabled = true;
    }

    // Promisify Redis commands
    if (this.redisClient) {
      this.getAsync = promisify(this.redisClient.get).bind(this.redisClient);
      this.setAsync = promisify(this.redisClient.setex).bind(this.redisClient);
    }
  }

  /**
   * Cache middleware for Express
   */
  cacheMiddleware(duration = 300) {
    return (req, res, next) => {
      const key = `cache:${req.originalUrl || req.url}`;

      // Skip cache for POST, PUT, DELETE
      if (req.method !== 'GET') {
        return next();
      }

      this.getCache(key).then(cached => {
        if (cached) {
          res.setHeader('X-Cache', 'HIT');
          return res.json(JSON.parse(cached));
        }

        res.setHeader('X-Cache', 'MISS');

        // Override res.json to cache the response
        const originalJson = res.json.bind(res);
        res.json = function (data) {
          if (res.statusCode === 200) {
            this.setCache(key, JSON.stringify(data), duration);
          }
          return originalJson(data);
        }.bind(this);

        next();
      });
    };
  }

  /**
   * Get cached value
   */
  async getCache(key) {
    try {
      if (this.cacheEnabled && this.getAsync) {
        return await this.getAsync(key);
      }

      // Fallback to in-memory cache
      if (this.inMemoryCache) {
        const cached = this.inMemoryCache.get(key);
        if (cached && cached.expires > Date.now()) {
          return cached.data;
        }
        this.inMemoryCache.delete(key);
      }

      return null;
    } catch (error) {
      console.warn('Cache retrieval error:', error);
      return null;
    }
  }

  /**
   * Set cached value
   */
  async setCache(key, value, duration = 300) {
    try {
      if (this.cacheEnabled && this.setAsync) {
        await this.setAsync(key, duration, value);
        return true;
      }

      // Fallback to in-memory cache
      if (this.inMemoryCache) {
        this.inMemoryCache.set(key, {
          data: value,
          expires: Date.now() + duration * 1000,
        });
        return true;
      }
    } catch (error) {
      console.warn('Cache set error:', error);
    }
    return false;
  }

  /**
   * Clear cache by pattern
   */
  async clearCache(pattern = '*') {
    try {
      if (this.cacheEnabled && this.redisClient) {
        const keys = await promisify(this.redisClient.keys).bind(this.redisClient)(pattern);
        if (keys.length > 0) {
          await promisify(this.redisClient.del).bind(this.redisClient)(keys);
        }
      }

      // Clear in-memory cache
      if (this.inMemoryCache) {
        this.inMemoryCache.clear();
      }
    } catch (error) {
      console.warn('Cache clear error:', error);
    }
  }

  /**
   * Compress response
   */
  compressResponse(data) {
    return new Promise((resolve, reject) => {
      zlib.gzip(JSON.stringify(data), (err, compressed) => {
        if (err) return reject(err);
        resolve(compressed);
      });
    });
  }

  /**
   * Decompress data
   */
  decompressData(buffer) {
    return new Promise((resolve, reject) => {
      zlib.gunzip(buffer, (err, decompressed) => {
        if (err) return reject(err);
        resolve(JSON.parse(decompressed.toString()));
      });
    });
  }

  /**
   * Batch queries - reduce database calls
   */
  async batchQuery(queries, executor) {
    const cache = new Map();
    const batchSize = 100;
    const results = [];

    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(query => executor(query)));
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Database query optimization - Use pagination
   */
  getPaginationParams(page = 1, limit = 20) {
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    return { skip, limit: limitNum, page: pageNum };
  }

  /**
   * Index optimization suggestions
   */
  getIndexSuggestions() {
    return {
      // User indexes
      'users.email': 'Speed up login queries',
      'users.role': 'Role-based filtering',
      'users.createdAt': 'Sorting and date range queries',

      // Program indexes
      'programs.userId': 'User program queries',
      'programs.status': 'Status filtering',
      'programs.createdAt': 'Recent programs',

      // Goal indexes
      'goals.programId': 'Program goals',
      'goals.userId': 'User goals',
      'goals.status': 'Goal status filtering',

      // Session indexes
      'sessions.userId': 'User sessions',
      'sessions.date': 'Session date range queries',

      // Composite indexes
      '(userId, createdAt)': 'Common query pattern',
      '(status, date)': 'Filtered sorting',
    };
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport() {
    return {
      timestamp: new Date(),
      cacheStatus: {
        enabled: this.cacheEnabled,
        type: this.redisClient ? 'Redis' : 'In-Memory',
        hitRate: await this.calculateCacheHitRate(),
      },
      recommendations: {
        enableCompression: true,
        enableCaching: true,
        batchDbQueries: true,
        usePagination: true,
        optimizeIndexes: this.getIndexSuggestions(),
      },
      optimizations: {
        gzipCompression: true,
        lazyLoadingEnabled: true,
        codeSplitting: true,
        cdnEnabled: false,
      },
    };
  }

  /**
   * Calculate cache hit rate
   */
  async calculateCacheHitRate() {
    try {
      if (this.redisClient) {
        const info = await promisify(this.redisClient.info).bind(this.redisClient)('stats');
        const lines = info.split('\r\n');
        let hits = 0;
        let misses = 0;

        lines.forEach(line => {
          if (line.includes('keyspace_hits')) {
            hits = parseInt(line.split(':')[1]);
          }
          if (line.includes('keyspace_misses')) {
            misses = parseInt(line.split(':')[1]);
          }
        });

        const total = hits + misses;
        return total > 0 ? ((hits / total) * 100).toFixed(2) + '%' : 'N/A';
      }
    } catch (error) {
      console.warn('Cache hit rate calculation error:', error);
    }
    return 'N/A';
  }

  /**
   * Lazy load large datasets
   */
  async lazyLoadData(query, pageSize = 50, currentPage = 1) {
    const skip = (currentPage - 1) * pageSize;

    return {
      data: [], // Populated by caller
      pagination: {
        currentPage,
        pageSize,
        hasMore: true,
        nextPage: currentPage + 1,
      },
    };
  }

  /**
   * Code splitting recommendation
   */
  getCodeSplittingStrategy() {
    return {
      bundles: {
        core: ['App.js', 'Router.js', 'Auth.js'],
        dashboard: ['Dashboard.js', 'Charts.js'],
        admin: ['AdminPanel.js', 'Management.js'],
        analytics: ['AnalyticsDashboard.js', 'Reports.js'],
        advanced: ['AdvancedFeatures.js', 'ExportImport.js'],
      },
      lazyLoaded: ['Chatbot', 'Gamification', 'Notifications', 'MLDashboard'],
    };
  }

  /**
   * Image optimization recommendations
   */
  getImageOptimizations() {
    return {
      formats: ['WebP for modern browsers', 'JPEG as fallback'],
      sizes: {
        thumbnail: '150x150',
        small: '300x300',
        medium: '600x600',
        large: '1200x1200',
      },
      compression: {
        quality: '0.8',
        method: 'mozjpeg',
      },
      lazyLoad: true,
    };
  }

  /**
   * Monitor query performance
   */
  async monitorQueryPerformance(query, startTime) {
    const duration = Date.now() - startTime;
    const isSlowQuery = duration > 1000;

    if (isSlowQuery) {
      console.warn(`Slow query detected: ${duration}ms for ${query}`);
    }

    return {
      query,
      duration,
      isSlowQuery,
      timestamp: new Date(),
    };
  }
}

module.exports = new PerformanceOptimizer();
