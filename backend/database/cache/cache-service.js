/**
 * Redis Cache Service - Al-Awael ERP
 * خدمة التخزين المؤقت
 *
 * Features:
 *  - Smart TTL management per key namespace
 *  - JSON serialization/deserialization
 *  - Cache-aside pattern helpers
 *  - Tag-based invalidation
 *  - Pipeline/bulk operations
 *  - Cache warming
 *  - Statistics & monitoring
 */

'use strict';

const Redis = require('ioredis');
const crypto = require('crypto');
const logger = require('../../utils/logger');

// ══════════════════════════════════════════════════════════════════
// TTL Configuration (seconds)
// ══════════════════════════════════════════════════════════════════
const TTL = {
  // Short-lived (session/request level)
  session: 3600, // 1 hour
  token: 900, // 15 min (refresh token)
  otp: 300, // 5 min
  rateLimit: 60, // 1 min

  // Medium (frequently changing)
  user: 1800, // 30 min
  permissions: 3600, // 1 hour
  settings: 7200, // 2 hours
  beneficiary: 3600, // 1 hour

  // Long-lived (stable data)
  lookup: 86400, // 24 hours (departments, leave types, etc.)
  roles: 86400, // 24 hours
  branches: 86400, // 24 hours
  programs: 86400, // 24 hours

  // Very long (almost static)
  static: 604800, // 7 days
  counters: 0, // No TTL (persistent counters)

  // Default fallback
  default: 3600, // 1 hour
};

// ══════════════════════════════════════════════════════════════════
// Key Prefixes
// ══════════════════════════════════════════════════════════════════
const PREFIX = {
  user: 'usr:',
  session: 'ses:',
  permissions: 'perm:',
  beneficiary: 'ben:',
  employee: 'emp:',
  settings: 'cfg:',
  lookup: 'lkp:',
  report: 'rpt:',
  otp: 'otp:',
  rateLimit: 'rl:',
  lock: 'lck:',
  tag: 'tag:',
  counter: 'cnt:',
  queue: 'q:',
};

// ══════════════════════════════════════════════════════════════════
// CacheService Class
// ══════════════════════════════════════════════════════════════════
class CacheService {
  constructor() {
    this.client = null;
    this.subscriber = null;
    this.connected = false;
    this.stats = {
      hits: 0,
      misses: 0,
      errors: 0,
      sets: 0,
      deletes: 0,
    };
  }

  // ────────────────────────────────────────────────────────────────
  // Connection
  // ────────────────────────────────────────────────────────────────
  async connect(options = {}) {
    const config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB) || 0,
      keyPrefix: process.env.REDIS_PREFIX || 'awael:',
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      lazyConnect: true,
      ...options,
    };

    try {
      this.client = new Redis(config);

      this.client.on('connect', () => {
        this.connected = true;
        logger.info('[Cache] Redis connected');
      });

      this.client.on('error', err => {
        this.connected = false;
        this.stats.errors++;
        logger.error('[Cache] Redis error:', { error: err.message });
      });

      this.client.on('close', () => {
        this.connected = false;
        logger.warn('[Cache] Redis connection closed');
      });

      await this.client.connect();
      await this.client.ping();
      this.connected = true;

      return this;
    } catch (err) {
      logger.error('[Cache] Failed to connect to Redis:', { error: err.message });
      this.connected = false;
      return this;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.connected = false;
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Core Operations
  // ────────────────────────────────────────────────────────────────

  /**
   * Get a cached value
   * @returns {*} Parsed value or null
   */
  async get(key) {
    if (!this.connected) return null;

    try {
      const data = await this.client.get(key);
      if (data === null) {
        this.stats.misses++;
        return null;
      }
      this.stats.hits++;
      return JSON.parse(data);
    } catch (err) {
      this.stats.errors++;
      logger.error(`[Cache] GET error for key "${key}":`, { error: err.message });
      return null;
    }
  }

  /**
   * Set a cached value
   * @param {string} key
   * @param {*} value - Will be JSON serialized
   * @param {number} ttl - TTL in seconds (0 = no expiry)
   */
  async set(key, value, ttl = TTL.default) {
    if (!this.connected) return false;

    try {
      const serialized = JSON.stringify(value);
      if (ttl > 0) {
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      this.stats.sets++;
      return true;
    } catch (err) {
      this.stats.errors++;
      logger.error(`[Cache] SET error for key "${key}":`, { error: err.message });
      return false;
    }
  }

  /**
   * Delete a key
   */
  async del(key) {
    if (!this.connected) return false;

    try {
      await this.client.del(key);
      this.stats.deletes++;
      return true;
    } catch (err) {
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    if (!this.connected) return false;

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (err) {
      return false;
    }
  }

  /**
   * Get remaining TTL in seconds (-1 = no expiry, -2 = not found)
   */
  async ttl(key) {
    if (!this.connected) return -2;

    try {
      return await this.client.ttl(key);
    } catch (err) {
      return -2;
    }
  }

  /**
   * Set expiry on existing key
   */
  async expire(key, seconds) {
    if (!this.connected) return false;

    try {
      await this.client.expire(key, seconds);
      return true;
    } catch (err) {
      return false;
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Cache-Aside Pattern
  // ────────────────────────────────────────────────────────────────

  /**
   * Get or fetch (cache-aside pattern)
   * Returns cached value, or calls fetchFn and caches the result
   *
   * @param {string} key
   * @param {Function} fetchFn - Async function to fetch data
   * @param {number} ttl - TTL in seconds
   */
  async getOrSet(key, fetchFn, ttl = TTL.default) {
    const cached = await this.get(key);
    if (cached !== null) return cached;

    const fresh = await fetchFn();
    if (fresh !== null && fresh !== undefined) {
      await this.set(key, fresh, ttl);
    }
    return fresh;
  }

  /**
   * Remember: alias for getOrSet with cleaner API
   */
  async remember(key, ttl, fetchFn) {
    return this.getOrSet(key, fetchFn, ttl);
  }

  // ────────────────────────────────────────────────────────────────
  // Bulk Operations
  // ────────────────────────────────────────────────────────────────

  /**
   * Get multiple keys at once
   */
  async mget(keys) {
    if (!this.connected || !keys.length) return {};

    try {
      const values = await this.client.mget(...keys);
      const result = {};
      keys.forEach((key, i) => {
        if (values[i] !== null) {
          try {
            result[key] = JSON.parse(values[i]);
            this.stats.hits++;
          } catch {
            result[key] = null;
            this.stats.misses++;
          }
        } else {
          result[key] = null;
          this.stats.misses++;
        }
      });
      return result;
    } catch (err) {
      this.stats.errors++;
      return {};
    }
  }

  /**
   * Set multiple keys using pipeline
   */
  async mset(entries, ttl = TTL.default) {
    if (!this.connected || !entries.length) return false;

    try {
      const pipeline = this.client.pipeline();
      for (const { key, value } of entries) {
        const serialized = JSON.stringify(value);
        if (ttl > 0) {
          pipeline.setex(key, ttl, serialized);
        } else {
          pipeline.set(key, serialized);
        }
      }
      await pipeline.exec();
      this.stats.sets += entries.length;
      return true;
    } catch (err) {
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Delete multiple keys
   */
  async mdel(keys) {
    if (!this.connected || !keys.length) return false;

    try {
      await this.client.del(...keys);
      this.stats.deletes += keys.length;
      return true;
    } catch (err) {
      this.stats.errors++;
      return false;
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Pattern-based Invalidation
  // ────────────────────────────────────────────────────────────────

  /**
   * Delete all keys matching a pattern
   * Uses SCAN (not KEYS) to avoid blocking
   */
  async invalidatePattern(pattern) {
    if (!this.connected) return 0;

    let cursor = '0';
    let deleted = 0;
    const fullPattern = (this.client.options.keyPrefix || '') + pattern;

    try {
      do {
        const [newCursor, keys] = await this.client.scan(
          cursor,
          'MATCH',
          fullPattern,
          'COUNT',
          100
        );
        cursor = newCursor;

        if (keys.length > 0) {
          // Strip prefix before calling del (ioredis adds it back)
          const stripped = keys.map(k =>
            k.startsWith(this.client.options.keyPrefix || '')
              ? k.slice((this.client.options.keyPrefix || '').length)
              : k
          );
          await this.client.del(...stripped);
          deleted += keys.length;
        }
      } while (cursor !== '0');

      this.stats.deletes += deleted;
      return deleted;
    } catch (err) {
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Invalidate all cache for a specific entity
   * e.g. invalidateEntity('beneficiary', '507f1f77bcf86cd799439011')
   */
  async invalidateEntity(entityType, id) {
    const prefix = PREFIX[entityType] || `${entityType}:`;
    const count = await this.invalidatePattern(`${prefix}${id}*`);
    return count;
  }

  // ────────────────────────────────────────────────────────────────
  // Tag-based Invalidation
  // ────────────────────────────────────────────────────────────────

  /**
   * Associate a cache key with tags for grouped invalidation
   */
  async tagKey(key, tags = []) {
    if (!this.connected || !tags.length) return;

    const pipeline = this.client.pipeline();
    for (const tag of tags) {
      pipeline.sadd(`${PREFIX.tag}${tag}`, key);
    }
    await pipeline.exec();
  }

  /**
   * Set a value and associate it with tags
   */
  async setTagged(key, value, ttl = TTL.default, tags = []) {
    await this.set(key, value, ttl);
    if (tags.length) await this.tagKey(key, tags);
  }

  /**
   * Invalidate all keys associated with a tag
   */
  async invalidateTag(tag) {
    if (!this.connected) return 0;

    try {
      const tagKey = `${PREFIX.tag}${tag}`;
      const keys = await this.client.smembers(tagKey);

      if (keys.length > 0) {
        await this.client.del(...keys, tagKey);
      } else {
        await this.client.del(tagKey);
      }

      this.stats.deletes += keys.length + 1;
      return keys.length;
    } catch (err) {
      this.stats.errors++;
      return 0;
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Distributed Lock
  // ────────────────────────────────────────────────────────────────

  /**
   * Acquire a distributed lock (simple SET NX PX)
   * Returns token if acquired, null if not
   */
  async acquireLock(resource, ttlMs = 5000) {
    if (!this.connected) return null;

    const token = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    const key = `${PREFIX.lock}${resource}`;

    try {
      const result = await this.client.set(key, token, 'NX', 'PX', ttlMs);
      return result === 'OK' ? token : null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Release a lock (only if we own it)
   */
  async releaseLock(resource, token) {
    if (!this.connected) return false;

    const key = `${PREFIX.lock}${resource}`;
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    try {
      const result = await this.client.eval(script, 1, key, token);
      return result === 1;
    } catch (err) {
      return false;
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Rate Limiting
  // ────────────────────────────────────────────────────────────────

  /**
   * Sliding window rate limiter
   * @returns {{ allowed: boolean, count: number, resetIn: number }}
   */
  async rateLimit(identifier, maxRequests, windowSeconds) {
    if (!this.connected) return { allowed: true, count: 0, resetIn: 0 };

    const key = `${PREFIX.rateLimit}${identifier}`;
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    try {
      const pipeline = this.client.pipeline();
      pipeline.zremrangebyscore(key, 0, now - windowMs);
      pipeline.zadd(key, now, `${now}`);
      pipeline.zcard(key);
      pipeline.expire(key, windowSeconds + 1);

      const results = await pipeline.exec();
      const count = results[2][1];
      const allowed = count <= maxRequests;

      return {
        allowed,
        count,
        remaining: Math.max(0, maxRequests - count),
        resetIn: windowSeconds,
      };
    } catch (err) {
      this.stats.errors++;
      return { allowed: true, count: 0, resetIn: 0 };
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Atomic Counter
  // ────────────────────────────────────────────────────────────────

  async increment(key, by = 1, ttl = null) {
    if (!this.connected) return null;

    try {
      const val = await this.client.incrby(key, by);
      if (ttl) await this.client.expire(key, ttl);
      return val;
    } catch (err) {
      return null;
    }
  }

  async decrement(key, by = 1) {
    if (!this.connected) return null;

    try {
      return await this.client.decrby(key, by);
    } catch (err) {
      return null;
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Hash Operations (for partial object updates)
  // ────────────────────────────────────────────────────────────────

  async hset(key, field, value, ttl = TTL.default) {
    if (!this.connected) return false;

    try {
      await this.client.hset(key, field, JSON.stringify(value));
      if (ttl > 0) await this.client.expire(key, ttl);
      return true;
    } catch (err) {
      return false;
    }
  }

  async hget(key, field) {
    if (!this.connected) return null;

    try {
      const val = await this.client.hget(key, field);
      return val ? JSON.parse(val) : null;
    } catch (err) {
      return null;
    }
  }

  async hgetall(key) {
    if (!this.connected) return null;

    try {
      const data = await this.client.hgetall(key);
      if (!data) return null;

      const parsed = {};
      for (const [field, val] of Object.entries(data)) {
        try {
          parsed[field] = JSON.parse(val);
        } catch {
          parsed[field] = val;
        }
      }
      return parsed;
    } catch (err) {
      return null;
    }
  }

  async hdel(key, field) {
    if (!this.connected) return false;

    try {
      await this.client.hdel(key, field);
      return true;
    } catch (err) {
      return false;
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Cache Warming
  // ────────────────────────────────────────────────────────────────

  /**
   * Warm up cache with static/lookup data
   * @param {Array<{key, fetchFn, ttl}>} warmupConfigs
   */
  async warmup(warmupConfigs = []) {
    if (!this.connected) {
      logger.warn('[Cache] Skipping warmup - Redis not connected');
      return;
    }

    logger.info(`[Cache] Starting warmup for ${warmupConfigs.length} keys...`);
    let warmed = 0;

    for (const config of warmupConfigs) {
      try {
        const exists = await this.exists(config.key);
        if (!exists) {
          const data = await config.fetchFn();
          if (data !== null && data !== undefined) {
            await this.set(config.key, data, config.ttl || TTL.lookup);
            warmed++;
          }
        }
      } catch (err) {
        logger.warn(`[Cache] Warmup failed for key "${config.key}":`, { error: err.message });
      }
    }

    logger.info(`[Cache] Warmup complete: ${warmed}/${warmupConfigs.length} keys cached`);
  }

  // ────────────────────────────────────────────────────────────────
  // Statistics & Health
  // ────────────────────────────────────────────────────────────────

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) + '%' : '0%',
      connected: this.connected,
    };
  }

  resetStats() {
    this.stats = { hits: 0, misses: 0, errors: 0, sets: 0, deletes: 0 };
  }

  async health() {
    if (!this.connected) {
      return { status: 'disconnected', latency: null };
    }

    const start = Date.now();
    try {
      await this.client.ping();
      const latency = Date.now() - start;

      const info = await this.client.info('memory');
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memory = memoryMatch ? memoryMatch[1].trim() : 'unknown';

      return {
        status: 'healthy',
        latency: `${latency}ms`,
        memory,
        stats: this.getStats(),
      };
    } catch (err) {
      return { status: 'error', error: err.message };
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Flush (use with caution!)
  // ────────────────────────────────────────────────────────────────

  /**
   * Flush only keys with our prefix (safe)
   */
  async flushNamespace() {
    const prefix = this.client.options.keyPrefix || 'awael:';
    return this.invalidatePattern('*');
  }
}

// ══════════════════════════════════════════════════════════════════
// Singleton + Express Middleware
// ══════════════════════════════════════════════════════════════════
const cacheService = new CacheService();

/**
 * Express middleware: attach cache to req.cache
 */
function cacheMiddleware(req, res, next) {
  req.cache = cacheService;
  next();
}

/**
 * HTTP response caching middleware
 * Usage: router.get('/endpoint', cacheResponse(300), handler)
 */
function cacheResponse(ttl = TTL.default, keyFn = null) {
  return async (req, res, next) => {
    const key = keyFn
      ? keyFn(req)
      : `http:${req.method}:${req.originalUrl}:${req.user?.id || 'anon'}`;

    const cached = await cacheService.get(key);
    if (cached) {
      return res.json({ ...cached, _cached: true });
    }

    // Override res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = async data => {
      if (res.statusCode === 200) {
        await cacheService.set(key, data, ttl);
      }
      return originalJson(data);
    };

    next();
  };
}

module.exports = {
  cacheService,
  CacheService,
  cacheMiddleware,
  cacheResponse,
  TTL,
  PREFIX,
};
