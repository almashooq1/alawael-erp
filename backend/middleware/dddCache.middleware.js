/**
 * DDD Caching Middleware — طبقة التخزين المؤقت للدومينات العلاجية
 *
 * Redis-backed caching layer for DDD domain API responses.
 * Supports per-domain TTL, automatic invalidation on write,
 * and cache-aside pattern with fallback to in-memory LRU.
 *
 * Usage in routes:
 *   const { dddCache, dddInvalidate } = require('../../middleware/dddCache.middleware');
 *   router.get('/',    dddCache('core', 300),  controller.list);
 *   router.post('/',   dddInvalidate('core'),  controller.create);
 *   router.put('/:id', dddInvalidate('core'),  controller.update);
 *
 * @module middleware/dddCache
 */

'use strict';

const crypto = require('crypto');

// ── Redis client (lazy load) ─────────────────────────────────────────────
let redisClient = null;

function getRedis() {
  if (redisClient) return redisClient;
  try {
    const { getRedisClient } = require('../config/redis.client');
    redisClient = getRedisClient();
    return redisClient;
  } catch {
    try {
      const Redis = require('ioredis');
      redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null, // Don't retry if not available
      });
      redisClient.connect().catch(() => {
        redisClient = null;
      });
      return redisClient;
    } catch {
      return null;
    }
  }
}

// ── In-memory fallback LRU cache ─────────────────────────────────────────
const memCache = new Map();
const MEM_CACHE_MAX = 500;

function memGet(key) {
  const entry = memCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memCache.delete(key);
    return null;
  }
  return entry.value;
}

function memSet(key, value, ttlMs) {
  // Evict oldest if at capacity
  if (memCache.size >= MEM_CACHE_MAX) {
    const oldest = memCache.keys().next().value;
    memCache.delete(oldest);
  }
  memCache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function memInvalidatePrefix(prefix) {
  for (const key of memCache.keys()) {
    if (key.startsWith(prefix)) {
      memCache.delete(key);
    }
  }
}

// ── Default TTLs per domain (seconds) ────────────────────────────────────
const DOMAIN_TTL = {
  core: 120, // Beneficiaries change moderately
  episodes: 120,
  timeline: 60, // Timeline is frequently updated
  assessments: 300,
  'care-plans': 300,
  sessions: 60, // Sessions change frequently (scheduling)
  goals: 180,
  measures: 600, // Measures library is static
  workflow: 30, // Tasks change very frequently
  programs: 300,
  'ai-recommendations': 180,
  quality: 300,
  family: 300,
  reports: 600,
  'group-therapy': 180,
  'tele-rehab': 120,
  'ar-vr': 120,
  behavior: 180,
  research: 600,
  'field-training': 300,
  dashboards: 30, // KPIs change frequently
};

const CACHE_PREFIX = 'ddd:cache:';

/**
 * Generate cache key from request
 */
function buildCacheKey(domain, req) {
  const parts = [CACHE_PREFIX, domain, req.originalUrl || req.url];
  // Include user role for role-specific responses
  if (req.user?.role) parts.push(req.user.role);
  // Deterministic hash for query params
  if (req.query && Object.keys(req.query).length > 0) {
    const hash = crypto
      .createHash('md5')
      .update(JSON.stringify(req.query))
      .digest('hex')
      .slice(0, 8);
    parts.push(hash);
  }
  return parts.join(':');
}

/**
 * Cache-aside middleware for GET requests
 *
 * @param {string} domain - DDD domain name
 * @param {number} [ttl] - TTL in seconds (defaults to DOMAIN_TTL[domain])
 * @returns {Function} Express middleware
 */
function dddCache(domain, ttl) {
  const effectiveTTL = ttl || DOMAIN_TTL[domain] || 120;

  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') return next();

    // Skip cache if explicitly requested
    if (req.headers['cache-control'] === 'no-cache' || req.query._nocache) {
      return next();
    }

    const key = buildCacheKey(domain, req);
    let cached = null;

    // Try Redis first
    const redis = getRedis();
    if (redis) {
      try {
        const data = await redis.get(key);
        if (data) {
          cached = JSON.parse(data);
        }
      } catch {
        /* Redis unavailable — fall through */
      }
    }

    // Fallback to memory cache
    if (!cached) {
      cached = memGet(key);
    }

    if (cached) {
      res.set('X-Cache', 'HIT');
      res.set('X-Cache-Domain', domain);
      return res.json(cached);
    }

    // Intercept res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = body => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Redis cache
        if (redis) {
          redis.setex(key, effectiveTTL, JSON.stringify(body)).catch(() => {});
        }
        // Memory cache
        memSet(key, body, effectiveTTL * 1000);
      }

      res.set('X-Cache', 'MISS');
      res.set('X-Cache-Domain', domain);
      return originalJson(body);
    };

    next();
  };
}

/**
 * Cache invalidation middleware for write operations
 *
 * @param {string|string[]} domains - Domain(s) to invalidate
 * @returns {Function} Express middleware
 */
function dddInvalidate(...domains) {
  const domainList = domains.flat();

  return async (req, res, next) => {
    // Intercept after response is sent
    const originalJson = res.json.bind(res);
    res.json = body => {
      // Invalidate on successful writes
      if (res.statusCode >= 200 && res.statusCode < 300) {
        for (const domain of domainList) {
          const prefix = `${CACHE_PREFIX}${domain}:`;

          // Redis invalidation
          const redis = getRedis();
          if (redis) {
            // Use SCAN to find and delete matching keys
            const stream = redis.scanStream({ match: `${prefix}*`, count: 100 });
            stream.on('data', keys => {
              if (keys.length) {
                redis.del(...keys).catch(() => {});
              }
            });
          }

          // Memory invalidation
          memInvalidatePrefix(prefix);
        }
      }
      return originalJson(body);
    };

    next();
  };
}

/**
 * Flush all DDD caches
 */
async function flushDDDCache() {
  const redis = getRedis();
  if (redis) {
    const stream = redis.scanStream({ match: `${CACHE_PREFIX}*`, count: 100 });
    let totalDeleted = 0;
    stream.on('data', keys => {
      if (keys.length) {
        redis.del(...keys).catch(() => {});
        totalDeleted += keys.length;
      }
    });
    await new Promise(resolve => stream.on('end', resolve));
    memCache.clear();
    return totalDeleted;
  }
  const memSize = memCache.size;
  memCache.clear();
  return memSize;
}

/**
 * Get cache statistics
 */
function getDDDCacheStats() {
  return {
    memoryEntries: memCache.size,
    memoryMaxSize: MEM_CACHE_MAX,
    prefix: CACHE_PREFIX,
    domainTTLs: { ...DOMAIN_TTL },
    redisAvailable: !!getRedis(),
  };
}

module.exports = {
  dddCache,
  dddInvalidate,
  flushDDDCache,
  getDDDCacheStats,
  DOMAIN_TTL,
};
