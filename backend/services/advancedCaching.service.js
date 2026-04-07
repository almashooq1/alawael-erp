/* eslint-disable no-unused-vars */
/**
 * Advanced Caching Service
 * خدمة التخزين المؤقت المتقدمة
 *
 * Uses Redis as primary cache (shared across processes/containers).
 * Falls back to in-memory Map() when Redis is unavailable.
 *
 * Round 30: Migrated from Map-only → Redis-first with Map fallback.
 */

const logger = require('../utils/logger');
const { getRedisClient } = require('../config/redis.config');

const CACHE_PREFIX = 'cache:';

class AdvancedCachingService {
  constructor() {
    // In-memory fallback (used when Redis is not connected)
    this._memCache = new Map();
    this.stats = { hits: 0, misses: 0 };
  }

  /** @returns {import('ioredis').Redis|null} */
  _redis() {
    const client = getRedisClient();
    return client && client.status === 'ready' ? client : null;
  }

  /**
   * Store a value in cache
   * @param {string} key
   * @param {*} value - Must be JSON-serializable
   * @param {number} ttl - Time-to-live in **milliseconds** (default: 1 hour)
   */
  async set(key, value, ttl = 3600000) {
    const redis = this._redis();
    if (redis) {
      try {
        const ttlSeconds = Math.max(1, Math.round(ttl / 1000));
        await redis.setex(CACHE_PREFIX + key, ttlSeconds, JSON.stringify(value));
        return { cached: true, key, store: 'redis' };
      } catch (err) {
        logger.warn('Redis cache SET failed, falling back to memory:', err.message);
      }
    }

    // Fallback: in-memory
    this._memCache.set(key, {
      value,
      expires: Date.now() + ttl,
    });
    return { cached: true, key, store: 'memory' };
  }

  /**
   * Retrieve a value from cache
   * @param {string} key
   * @returns {*|null}
   */
  async get(key) {
    const redis = this._redis();
    if (redis) {
      try {
        const data = await redis.get(CACHE_PREFIX + key);
        if (data !== null) {
          this.stats.hits++;
          return JSON.parse(data);
        }
        this.stats.misses++;
        return null;
      } catch (err) {
        logger.warn('Redis cache GET failed, falling back to memory:', err.message);
      }
    }

    // Fallback: in-memory
    const entry = this._memCache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    if (entry.expires < Date.now()) {
      this._memCache.delete(key);
      this.stats.misses++;
      return null;
    }
    this.stats.hits++;
    return entry.value;
  }

  /**
   * Invalidate all keys matching a substring pattern
   * @param {string} pattern - Substring to match against keys
   * @returns {{ invalidated: number }}
   */
  async invalidate(pattern) {
    let count = 0;
    const redis = this._redis();

    if (redis) {
      try {
        // SCAN for matching keys (avoids blocking KEYS command)
        let cursor = '0';
        do {
          const [nextCursor, keys] = await redis.scan(
            cursor,
            'MATCH',
            `*${CACHE_PREFIX}*${pattern}*`,
            'COUNT',
            100
          );
          cursor = nextCursor;
          if (keys.length > 0) {
            await redis.del(...keys);
            count += keys.length;
          }
        } while (cursor !== '0');
      } catch (err) {
        logger.warn('Redis cache INVALIDATE failed:', err.message);
      }
    }

    // Also clear matching entries from memory fallback
    for (const key of this._memCache.keys()) {
      if (key.includes(pattern)) {
        this._memCache.delete(key);
        count++;
      }
    }

    return { invalidated: count };
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    const redis = this._redis();

    let redisKeyCount = 0;
    if (redis) {
      try {
        let cursor = '0';
        do {
          const [nextCursor, keys] = await redis.scan(
            cursor,
            'MATCH',
            `*${CACHE_PREFIX}*`,
            'COUNT',
            500
          );
          cursor = nextCursor;
          redisKeyCount += keys.length;
        } while (cursor !== '0');
      } catch (_) {
        // ignore stats error
      }
    }

    return {
      ...this.stats,
      hitRate,
      memorySize: this._memCache.size,
      redisSize: redisKeyCount,
      size: this._memCache.size + redisKeyCount,
      store: redis ? 'redis' : 'memory',
    };
  }

  /**
   * Clear all cached entries
   */
  async clear() {
    const redis = this._redis();
    if (redis) {
      try {
        // Only clear our prefixed keys, not all Redis data
        let cursor = '0';
        do {
          const [nextCursor, keys] = await redis.scan(
            cursor,
            'MATCH',
            `*${CACHE_PREFIX}*`,
            'COUNT',
            500
          );
          cursor = nextCursor;
          if (keys.length > 0) {
            await redis.del(...keys);
          }
        } while (cursor !== '0');
      } catch (err) {
        logger.warn('Redis cache CLEAR failed:', err.message);
      }
    }

    this._memCache.clear();
    return { cleared: true };
  }
}

module.exports = AdvancedCachingService;
