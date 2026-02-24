/**
 * Redis Caching Layer Implementation
 * Optimizes database queries and API responses
 * 
 * NOTE: Redis not required for mock mode
 * Activate when switching to MongoDB production
 */

const redis = require('redis');
const { promisify } = require('util');

class CacheLayer {
  constructor(options = {}) {
    this.enabled = process.env.REDIS_ENABLED === 'true';
    this.ttl = options.ttl || 3600; // Default 1 hour
    this.client = null;
    
    if (this.enabled) {
      this.client = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB || 0
      });

      this.client.on('error', (err) => {
        console.error('Redis connection error:', err);
        this.enabled = false;
      });

      this.client.on('connect', () => {
        console.log('✅ Redis Cache Layer Connected');
      });
    }

    // Promisify Redis methods
    if (this.client) {
      this.get = promisify(this.client.get).bind(this.client);
      this.set = promisify(this.client.set).bind(this.client);
      this.del = promisify(this.client.del).bind(this.client);
      this.expire = promisify(this.client.expire).bind(this.client);
    }
  }

  /**
   * Generate cache key from request parameters
   */
  generateKey(prefix, params = {}) {
    const paramStr = JSON.stringify(params);
    return `${prefix}:${Buffer.from(paramStr).toString('base64')}`;
  }

  /**
   * Get cached value
   */
  async getCache(key) {
    if (!this.enabled) return null;

    try {
      const cached = await this.get(key);
      if (cached) {
        console.log(`✓ Cache HIT: ${key}`);
        return JSON.parse(cached);
      }
      console.log(`✗ Cache MISS: ${key}`);
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cached value
   */
  async setCache(key, value, ttl = null) {
    if (!this.enabled) return false;

    try {
      const serialized = JSON.stringify(value);
      await this.set(key, serialized);
      
      if (ttl) {
        await this.expire(key, ttl / 1000); // Convert ms to seconds
      } else {
        await this.expire(key, this.ttl);
      }

      console.log(`✓ Cache SET: ${key}`);
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete cached value
   */
  async deleteCache(key) {
    if (!this.enabled) return false;

    try {
      await this.del(key);
      console.log(`✓ Cache DELETE: ${key}`);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Invalidate cache pattern
   */
  async invalidatePattern(pattern) {
    if (!this.enabled) return false;

    try {
      // Get all keys matching pattern
      const keys = await promisify(this.client.keys).bind(this.client)(pattern);
      
      if (keys.length > 0) {
        await this.del(...keys);
        console.log(`✓ Cache INVALIDATE: ${keys.length} keys matching "${pattern}"`);
      }
      return true;
    } catch (error) {
      console.error('Cache invalidate error:', error);
      return false;
    }
  }

  /**
   * Middleware for caching GET requests
   */
  cacheMiddleware(options = {}) {
    const self = this;
    const exclude = options.exclude || [];
    const ttl = options.ttl || this.ttl;

    return async (req, res, next) => {
      // Only cache GET requests
      if (req.method !== 'GET') return next();

      // Check exclusions
      if (exclude.some(path => req.path.includes(path))) {
        return next();
      }

      const cacheKey = self.generateKey(req.path, req.query);

      try {
        // Try to get from cache
        const cached = await self.getCache(cacheKey);
        if (cached) {
          res.set('X-Cache', 'HIT');
          return res.json(cached);
        }

        res.set('X-Cache', 'MISS');

        // Wrap res.json to cache the response
        const originalJson = res.json.bind(res);
        res.json = function(data) {
          self.setCache(cacheKey, data, ttl);
          return originalJson(data);
        };

        next();
      } catch (error) {
        console.error('Cache middleware error:', error);
        next();
      }
    };
  }

  /**
   * Clear all cache
   */
  async clearAll() {
    if (!this.enabled) return false;

    try {
      await promisify(this.client.flushdb).bind(this.client)();
      console.log('✓ Cache CLEARED: All keys removed');
      return true;
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  close() {
    if (this.client) {
      this.client.quit();
      console.log('Redis connection closed');
    }
  }
}

module.exports = new CacheLayer();
