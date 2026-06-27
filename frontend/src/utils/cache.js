/**
 * Request Cache Utility
 * أداة التخزين المؤقت للطلبات API
 *
 * Lightweight in-memory cache with TTL for API responses.
 * Designed for dashboard data, reference lists, and other
 * semi-static data that doesn't change frequently.
 */

class RequestCache {
  constructor(defaultTTL = 60000) { // 1 minute default
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  /**
   * Generate a cache key from request config
   */
  _getKey(config) {
    const method = config.method || 'get';
    const url = config.url || '';
    const params = JSON.stringify(config.params || {});
    return `${method}:${url}:${params}`;
  }

  /**
   * Get cached response if valid
   */
  get(config) {
    const key = this._getKey(config);
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Store response in cache
   */
  set(config, data, ttl = null) {
    const key = this._getKey(config);
    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { data, expiresAt });
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  invalidate(pattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance
export const requestCache = new RequestCache(300000); // 5 minutes default TTL

/**
 * Cached API wrapper
 * Wraps an API call with caching logic
 */
export async function cachedApiCall(apiFn, config, options = {}) {
  const { ttl = 300000, skipCache = false } = options;

  // Skip cache for mutations
  if (config.method && config.method.toLowerCase() !== 'get') {
    return apiFn(config);
  }

  if (!skipCache) {
    const cached = requestCache.get(config);
    if (cached) {
      return cached;
    }
  }

  const result = await apiFn(config);
  requestCache.set(config, result, ttl);
  return result;
}

export default requestCache;
