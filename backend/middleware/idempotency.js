/**
 * Idempotency Middleware — حماية ضد الطلبات المكررة
 *
 * Prevents duplicate processing of mutation requests by using
 * an `Idempotency-Key` header. Responses are cached in Redis
 * (or in-memory fallback) so retries return the same result.
 *
 * Usage:
 *   const { idempotent } = require('../middleware/idempotency');
 *
 *   router.post('/payments', idempotent(), paymentHandler);
 *   router.post('/transactions', idempotent({ ttl: 86400 }), txHandler);
 *
 * Client must send:
 *   Idempotency-Key: <uuid or unique string>
 */

'use strict';

const _crypto = require('crypto');

// In-memory fallback when Redis is unavailable
const memoryStore = new Map();
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 min

// Periodic cleanup of expired in-memory entries
let _cleanupTimer = null;
function ensureCleanup() {
  if (_cleanupTimer) return;
  _cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore) {
      if (entry.expiresAt <= now) memoryStore.delete(key);
    }
  }, CLEANUP_INTERVAL);
  _cleanupTimer.unref();
}

/**
 * Get the Redis client if available.
 * @returns {object|null}
 */
function getRedis() {
  try {
    const redis = require('../config/redis');
    if (redis && typeof redis.get === 'function') return redis;
  } catch {
    // Redis not available — use memory fallback
  }
  return null;
}

/**
 * Create idempotency middleware.
 *
 * @param {object} [opts]
 * @param {number} [opts.ttl=86400]       — Cache TTL in seconds (default: 24h)
 * @param {string} [opts.prefix='idemp:'] — Redis key prefix
 * @returns {Function} Express middleware
 */
function idempotent(opts = {}) {
  const ttl = opts.ttl || 86400;
  const prefix = opts.prefix || 'idemp:';

  return async (req, res, next) => {
    const key = req.headers['idempotency-key'];

    // No key → skip (caller doesn't need idempotency)
    if (!key) return next();

    // Validate key format (max 128 chars, alphanumeric + dashes)
    if (typeof key !== 'string' || key.length > 128 || !/^[\w-]+$/.test(key)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_IDEMPOTENCY_KEY',
        message: 'Idempotency-Key must be 1-128 alphanumeric/dash characters',
      });
    }

    const cacheKey = `${prefix}${key}`;
    const redis = getRedis();

    // ─── Check for existing cached response ────────────────────────
    try {
      let cached = null;
      if (redis) {
        const raw = await redis.get(cacheKey);
        if (raw) cached = JSON.parse(raw);
      } else {
        ensureCleanup();
        const entry = memoryStore.get(cacheKey);
        if (entry && entry.expiresAt > Date.now()) {
          cached = entry.data;
        }
      }

      if (cached) {
        // Return the cached response with indicator header
        res.setHeader('Idempotent-Replayed', 'true');
        return res.status(cached.statusCode).json(cached.body);
      }
    } catch {
      // Cache miss on error — continue normally
    }

    // ─── Intercept the response to cache it ────────────────────────
    const originalJson = res.json.bind(res);
    res.json = body => {
      const statusCode = res.statusCode || 200;

      // Only cache successful responses (2xx)
      if (statusCode >= 200 && statusCode < 300) {
        const payload = JSON.stringify({ statusCode, body });
        try {
          if (redis) {
            redis.set(cacheKey, payload, 'EX', ttl).catch(() => {});
          } else {
            ensureCleanup();
            memoryStore.set(cacheKey, {
              data: { statusCode, body },
              expiresAt: Date.now() + ttl * 1000,
            });
          }
        } catch {
          // Best-effort caching
        }
      }

      return originalJson(body);
    };

    next();
  };
}

module.exports = { idempotent };
