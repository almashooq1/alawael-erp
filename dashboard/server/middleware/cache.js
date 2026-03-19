/**
 * Response Caching Middleware
 * Improves performance by caching API responses
 */

const NodeCache = require('node-cache');

// Create cache instance
// stdTTL: default time-to-live in seconds
// checkperiod: automatic delete check interval
const cache = new NodeCache({
  stdTTL: 300, // 5 minutes default
  checkperiod: 600, // Check for expired keys every 10 minutes
  useClones: false, // Don't clone data (better performance)
});

/**
 * Cache middleware factory
 * @param {number} duration - Cache duration in seconds
 */
function cacheMiddleware(duration = 300) {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = generateCacheKey(req);
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
      // Cache hit
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-Key', key);
      return res.json(cachedResponse);
    }

    // Cache miss - store original res.json
    res.setHeader('X-Cache', 'MISS');
    const originalJson = res.json.bind(res);

    res.json = body => {
      // Store in cache
      cache.set(key, body, duration);
      res.setHeader('X-Cache-Key', key);
      return originalJson(body);
    };

    next();
  };
}

/**
 * Generate cache key from request
 */
function generateCacheKey(req) {
  const { path, query, params } = req;
  return `${path}:${JSON.stringify(query)}:${JSON.stringify(params)}`;
}

/**
 * Clear cache for specific pattern
 */
function clearCache(pattern) {
  if (pattern) {
    const keys = cache.keys();
    const matchedKeys = keys.filter(key => key.includes(pattern));
    matchedKeys.forEach(key => cache.del(key));
    return matchedKeys.length;
  } else {
    cache.flushAll();
    return 'all';
  }
}

/**
 * Get cache statistics
 */
function getCacheStats() {
  return cache.getStats();
}

/**
 * Cache configuration presets
 */
const CacheDurations = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 900, // 15 minutes
  HOUR: 3600, // 1 hour
  DAY: 86400, // 24 hours
};

/**
 * Smart cache middleware - automatic duration based on endpoint
 */
function smartCache(req, res, next) {
  // Determine cache duration based on endpoint
  let duration = CacheDurations.MEDIUM; // default

  if (req.path.includes('/trends')) {
    duration = CacheDurations.LONG; // Trends change slowly
  } else if (req.path.includes('/status')) {
    duration = CacheDurations.SHORT; // Status changes frequently
  } else if (req.path.includes('/analytics/patterns')) {
    duration = CacheDurations.HOUR; // Patterns are expensive to compute
  } else if (req.path.includes('/analytics/overview')) {
    duration = CacheDurations.LONG;
  }

  return cacheMiddleware(duration)(req, res, next);
}

/**
 * Cache invalidation middleware
 * Clears cache when data changes
 */
function invalidateCache(pattern) {
  return (req, res, next) => {
    // Clear cache after successful POST/PUT/DELETE
    const originalSend = res.send.bind(res);
    res.send = body => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        clearCache(pattern);
      }
      return originalSend(body);
    };
    next();
  };
}

module.exports = {
  cacheMiddleware,
  smartCache,
  clearCache,
  getCacheStats,
  CacheDurations,
  invalidateCache,
  cache,
};
