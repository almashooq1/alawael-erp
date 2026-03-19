/**
 * Performance Optimizer Utility
 * Implements caching, compression, and response optimization strategies
 * 
 * Features:
 * - Gzip response compression
 * - Cache-Control headers optimization
 * - Request result caching (in-memory)
 * - Response size optimization
 * - Performance metrics tracking
 */

const compression = require('compression');

// ==================== CONFIGURATION ====================
const CACHE_CONFIG = {
  // Cache duration by route pattern (in seconds)
  durations: {
    '/health': 5,
    '/api/health': 10,
    '/api/analytics': 30,
    '/api/reports': 60,
    '/api/dashboard': 30,
    '/api/notifications': 0, // No cache - real-time data
    '/api/users': 0, // No cache - user-specific data
  },
  
  // Maximum cache size in MB
  maxSize: 50,
  
  // Enable/disable compression
  compression: true,
  
  // Compression options
  compressionOptions: {
    level: 6, // 0-9, default 6
    threshold: 1024, // Only compress responses > 1KB
  },
};

// ==================== IN-MEMORY CACHE ====================
class ResponseCache {
  constructor(maxSizeMB = 50) {
    this.cache = new Map();
    this.maxSize = maxSizeMB * 1024 * 1024;
    this.currentSize = 0;
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Generate cache key from request
   */
  generateKey(req) {
    const method = req.method || 'GET';
    const path = req.originalUrl || req.url;
    return `${method}:${path}`;
  }

  /**
   * Get cached response
   */
  get(key) {
    if (!this.cache.has(key)) {
      this.misses++;
      return null;
    }

    const entry = this.cache.get(key);
    
    // Check if expired
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.currentSize -= entry.size;
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.data;
  }

  /**
   * Set cached response
   */
  set(key, data, durationSeconds = 60) {
    // Calculate size of data
    const size = JSON.stringify(data).length;

    // Evict old entries if needed
    if (this.currentSize + size > this.maxSize) {
      this.evict();
    }

    const entry = {
      data: data,
      size: size,
      createdAt: Date.now(),
      expiresAt: durationSeconds > 0 ? Date.now() + (durationSeconds * 1000) : null,
    };

    this.cache.set(key, entry);
    this.currentSize += size;
  }

  /**
   * Evict old entries using LRU (Least Recently Used)
   */
  evict() {
    const entriesToRemove = Math.ceil(this.cache.size * 0.2); // Remove 20% of old entries
    let removed = 0;

    // Sort by creation time (oldest first)
    const sorted = Array.from(this.cache.entries())
      .sort((a, b) => a[1].createdAt - b[1].createdAt);

    for (let i = 0; i < entriesToRemove && i < sorted.length; i++) {
      const [key, entry] = sorted[i];
      this.cache.delete(key);
      this.currentSize -= entry.size;
      removed++;
    }

    console.log(`📦 Cache evicted ${removed} old entries (freed ${Math.round(removed * 1024 / 1024)}MB)`);
  }

  /**
   * Clear entire cache
   */
  clear() {
    this.cache.clear();
    this.currentSize = 0;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = (this.hits / (this.hits + this.misses)) * 100 || 0;
    
    return {
      entries: this.cache.size,
      size: `${(this.currentSize / 1024 / 1024).toFixed(2)} MB`,
      maxSize: `${CACHE_CONFIG.maxSize} MB`,
      hits: this.hits,
      misses: this.misses,
      hitRate: `${hitRate.toFixed(2)}%`,
    };
  }
}

// ==================== CACHE INSTANCE ====================
const cache = new ResponseCache(CACHE_CONFIG.maxSize);

// ==================== MIDDLEWARE ====================

/**
 * Add compression middleware
 */
const compressionMiddleware = () => {
  if (!CACHE_CONFIG.compression) {
    return (req, res, next) => next();
  }

  return compression(CACHE_CONFIG.compressionOptions);
};

/**
 * Cache control headers middleware
 */
const cacheControlMiddleware = (req, res, next) => {
  // Determine cache duration based on route
  let cacheDuration = 0;
  for (const [pattern, duration] of Object.entries(CACHE_CONFIG.durations)) {
    if (req.path.startsWith(pattern)) {
      cacheDuration = duration;
      break;
    }
  }

  // Set cache headers
  if (cacheDuration > 0) {
    res.set('Cache-Control', `public, max-age=${cacheDuration}`);
    res.set('X-Cache-Duration', `${cacheDuration}s`);
  } else {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }

  // Wrap res.json if it exists
  if (res.json) {
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      const size = JSON.stringify(data).length;
      res.set('X-Response-Size', `${size}B`);
      res.set('X-Cache-Duration', `${cacheDuration}s`);
      return originalJson(data);
    };
  }

  // Wrap res.send if it exists
  if (res.send) {
    const originalSend = res.send.bind(res);
    res.send = function(data) {
      if (typeof data === 'object') {
        const size = JSON.stringify(data).length;
        res.set('X-Response-Size', `${size}B`);
      }
      return originalSend(data);
    };
  }

  next();
};

/**
 * Request response caching middleware
 */
const responseCachingMiddleware = (req, res, next) => {
  // Only cache GET requests
  if (req.method !== 'GET') {
    return next();
  }

  const cacheKey = cache.generateKey(req);
  
  // Check if response is cached
  const cachedResponse = cache.get(cacheKey);
  if (cachedResponse) {
    res.set('X-Cache', 'HIT');
    return res.json(cachedResponse);
  }

  // Intercept res.json to cache response
  const originalJson = res.json.bind(res);
  
  res.json = function(data) {
    // Determine cache duration
    let cacheDuration = 0;
    for (const [pattern, duration] of Object.entries(CACHE_CONFIG.durations)) {
      if (req.path.startsWith(pattern)) {
        cacheDuration = duration;
        break;
      }
    }

    // Cache the response
    if (cacheDuration > 0 && data) {
      cache.set(cacheKey, data, cacheDuration);
      res.set('X-Cache', 'MISS');
      res.set('X-Cache-Duration', `${cacheDuration}s`);
    }

    return originalJson(data);
  };

  next();
};

/**
 * Monitoring middleware - tracks response performance
 */
const performanceMonitoringMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const originalJson = res.json.bind(res);

  res.json = function(data) {
    const duration = Date.now() - startTime;
    
    // Add performance headers
    res.set('X-Response-Time', `${duration}ms`);
    
    // Log slow requests
    if (duration > 1000) {
      console.warn(`⚠️  Slow request: ${req.method} ${req.path} took ${duration}ms`);
    }

    return originalJson(data);
  };

  next();
};

// ==================== CACHE MANAGEMENT ===================

/**
 * Clear cache for specific route or all routes
 */
const clearCache = (path = null) => {
  if (!path) {
    cache.clear();
    console.log('🧹 Cache cleared completely');
    return;
  }

  // Clear cache entries matching path
  let cleared = 0;
  for (const [key, entry] of cache.cache.entries()) {
    if (key.includes(path)) {
      cache.cache.delete(key);
      cache.currentSize -= entry.size;
      cleared++;
    }
  }

  console.log(`🧹 Cleared ${cleared} cache entries for path: ${path}`);
};

/**
 * Get cache statistics
 */
const getCacheStats = () => cache.getStats();

// ==================== OPTIMIZATION SETUP ====================

/**
 * Initialize all performance optimizations
 */
function initializePerformanceOptimizations(app) {
  // Add compression
  app.use(compressionMiddleware());

  // Add cache control headers
  app.use(cacheControlMiddleware);

  // Add response caching
  app.use(responseCachingMiddleware);

  // Add performance monitoring
  app.use(performanceMonitoringMiddleware);

  console.log('✅ Performance optimizations initialized');
  console.log('   - Compression: Enabled');
  console.log('   - Response caching: Enabled');
  console.log('   - Cache-Control headers: Enabled');
  console.log('   - Performance monitoring: Enabled');
  console.log('   - Management endpoints: Register manually in app.js (/api/cache-stats, /api/cache/clear)');
}

// ==================== EXPORTS ====================

module.exports = {
  compression: compressionMiddleware,
  cacheControl: cacheControlMiddleware,
  responseCache: responseCachingMiddleware,
  performanceMonitoring: performanceMonitoringMiddleware,
  initializePerformanceOptimizations,
  clearCache,
  getCacheStats,
  ResponseCache,
  CACHE_CONFIG,
};
